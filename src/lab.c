#include "lab.h"
#include "../vendor/bikerace-vita/src/game/bike.h"
#include <math.h>
#include <string.h>

/* Browser adapter. Vendor equations and constants are unmodified.
 * Simulation order follows upstream game.c at a 60 Hz reference cadence:
 * gravity -> springs -> rear/front/head contacts -> integrate -> lean.
 * Each reference tick is split into six equal substeps (< 3 ms).
 * A fixed 60 Hz cadence prevents 60/90/120 Hz screens changing the physics.
 * Tracks and graphics are original to this testbed. No original assets needed.
 */
#define MAX_BOARDS 1800
static br_board boards[MAX_BOARDS];
static int count, track_id, acro_id, rear_grounded, front_grounded, status;
static br_bike bike;
static float snapshot[22], elapsed, finish_x, finish_y, spawn_y, last_lean;

static void segment(float ax, float ay, float bx, float by)
{
    float dx = bx - ax, dy = by - ay;
    int n = (int)ceilf(sqrtf(dx*dx + dy*dy) / 0.18f), i;
    if (n < 1) return;
    for (i = 0; i < n && count < MAX_BOARDS; i++) {
        br_board *b = &boards[count++];
        float t = (float)i/n, u = (float)(i+1)/n;
        v2_set(&b->v1, ax+dx*t, ay+dy*t);
        v2_set(&b->v2, ax+dx*u, ay+dy*u);
    }
}

static void make_track(int track)
{
    count = 0; spawn_y = 0.04f; finish_y = -0.3f;
    if (track == 1) {
        segment(-4,0,3,0); segment(3,0,4.8f,0.65f);
        segment(4.8f,0.65f,6.6f,0); segment(6.6f,0,8,0);
        segment(8,0,9.5f,1.3f); segment(9.5f,1.3f,10.3f,1.65f);
        segment(12.0f,0.45f,15,0); segment(15,0,28,0);
        finish_x = 24;
    } else if (track == 2) {
        float x = 5, y = 0, radius = 0.65f;
        int i;
        spawn_y = 0.84f;
        segment(-4,0.8f,1,0.8f); segment(1,0.8f,3,0); segment(3,0,5,0);
        for (i = 1; i <= 96; i++) {
            float a = -1.57079632679f + (float)i*6.28318530718f/96;
            float nx = 5+radius*cosf(a), ny = radius+radius*sinf(a);
            segment(x,y,nx,ny); x=nx; y=ny;
        }
        segment(5,0,18,0); finish_x = 15;
    } else if (track == 3) {
        spawn_y = 1.84f;
        segment(-4,1.8f,2,1.8f); segment(2.35f,0,35,0);
        finish_x = 30;
    } else {
        segment(-12,0,75,0); finish_x = 60;
    }
}

static void update_snapshot(void)
{
    snapshot[0]=bike.rear.pos.x; snapshot[1]=bike.rear.pos.y;
    snapshot[2]=bike.front.pos.x; snapshot[3]=bike.front.pos.y;
    snapshot[4]=bike.head.pos.x; snapshot[5]=bike.head.pos.y;
    snapshot[6]=bike.rear.angle_deg; snapshot[7]=bike.front.angle_deg;
    snapshot[8]=bike.chassis.com.x; snapshot[9]=bike.chassis.com.y;
    snapshot[10]=v2_len(&bike.chassis.com_vel);
    snapshot[11]=br_bike_angle_deg(&bike);
    snapshot[12]=(float)rear_grounded; snapshot[13]=(float)front_grounded;
    snapshot[14]=(float)status; snapshot[15]=elapsed;
    snapshot[16]=bike.head.pos.x; snapshot[17]=bike.chassis.ang_momentum;
    snapshot[18]=last_lean; snapshot[19]=(float)track_id;
    snapshot[20]=finish_x; snapshot[21]=finish_y;
}

void lab_reset(int track, int acro)
{
    vec2 spawn;
    track_id = track >= 0 && track <= 3 ? track : 0;
    acro_id = acro != 0;
    make_track(track_id);
    v2_set(&spawn,0,spawn_y);
    br_bike_init(&bike, acro_id ? BR_BIKE_ACROBATIC : BR_BIKE_REGULAR, &spawn);
    elapsed = last_lean = 0; status = rear_grounded = front_grounded = 0;
    update_snapshot();
}

void lab_step(float lean, int gas, int brake)
{
    int i,n; const float frame_dt = 1.0f/60.0f;
    const int substeps = (int)((1.0f/60.0f)/0.003f)+1;
    const float dt = frame_dt/(float)substeps;
    vec2 gravity;
    if (status) return;
    if (!isfinite(lean)) lean = 0;
    lean = fmaxf(-0.5f, fminf(0.5f,lean)); last_lean = lean;
    br_bike_set_state(&bike, gas ? BR_BIKE_ACCELERATING : brake ? BR_BIKE_BRAKING : BR_BIKE_IDLE);
    v2_set(&gravity,0,bike.def->gravity_y);
    rear_grounded = front_grounded = 0;
    for (n=0;n<substeps;n++) {
        br_bike_apply_gravity(&bike,&gravity,dt);
        br_bike_apply_springs(&bike,dt);
        for (i=0;i<count;i++) {
            /* Conservative cull only; retain original track iteration order. */
            const br_board *b = &boards[i];
            float lo=fminf(b->v1.x,b->v2.x)-0.6f, hi=fmaxf(b->v1.x,b->v2.x)+0.6f;
            if (bike.chassis.com.x < lo || bike.chassis.com.x > hi) continue;
            if (br_bike_collide_rear(&bike,b,dt)>0) rear_grounded=1;
            if (br_bike_collide_front(&bike,b,dt)>0) front_grounded=1;
            br_bike_collide_head(&bike,b,dt);
        }
        br_bike_step(&bike,dt);
        br_bike_apply_lean(&bike,lean,dt,front_grounded);
    }
    elapsed += frame_dt;
    if (!isfinite(bike.head.pos.x) || !isfinite(bike.head.pos.y) ||
        !isfinite(bike.front.pos.x) || !isfinite(bike.front.pos.y) ||
        !isfinite(bike.rear.pos.x) || !isfinite(bike.rear.pos.y)) {
        status=3;
    } else {
        for (i=0;i<count;i++) {
            if (br_bike_head_hits(&bike,&boards[i])) { status=1; break; }
        }
        if (bike.head.pos.y < -5 || bike.head.pos.x < -11) status=1;
        if (!status && bike.head.pos.x > finish_x && bike.head.pos.y > finish_y) status=2;
    }
    /* Freeze on crash for easy inspection; no artificial crash physics. */
    update_snapshot();
}

float lab_get(int index) { return index>=0 && index<22 ? snapshot[index] : 0; }
int lab_board_count(void) { return count; }
float lab_board_get(int b,int c) {
    if (b<0 || b>=count) return 0;
    switch(c) { case 0:return boards[b].v1.x; case 1:return boards[b].v1.y;
      case 2:return boards[b].v2.x; case 3:return boards[b].v2.y; default:return 0; }
}
