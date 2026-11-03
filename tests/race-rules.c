/* Native-only fixtures inspect the adapter's private state without adding
 * any test hooks or position-setting functions to the shipped Wasm API. */
#include "../src/lab.c"
#include <assert.h>
#include <stdio.h>

static void place_upper(float x,float y,float vx)
{
    vec2 spawn;
    v2_set(&spawn,x,y-.42f);
    br_bike_init(&bike,acro_id?BR_BIKE_ACROBATIC:BR_BIKE_REGULAR,&spawn);
    v2_set(&bike.head.vel,vx,0);
    v2_set(&bike.front.vel,vx,0);
    v2_set(&bike.rear.vel,vx,0);
    br_composed_update(&bike.chassis);
    update_snapshot();
}

/* Front wheel first, then upper mass loads the suspension. */
static void hard_one_wheel(int acro)
{
    int ai,vi,n,found=0;
    for(ai=0;ai<5;ai++)for(vi=0;vi<5;vi++) {
        float angle=(-30.0f-15.0f*ai)*.01745329252f;
        float c=cosf(angle),s=sinf(angle),speed=4.0f+2.0f*vi;
        br_body *bodies[3];int i,first_contact=0;
        lab_reset(0,acro);race_started=1;
        bodies[0]=&bike.head;bodies[1]=&bike.front;bodies[2]=&bike.rear;
        for(i=0;i<3;i++) {
            float x=bodies[i]->pos.x-.17f,y=bodies[i]->pos.y-spawn_y-.1f;
            v2_set(&bodies[i]->pos,x*c-y*s,.15f+x*s+y*c);
            v2_set(&bodies[i]->vel,0,-speed);
        }
        br_composed_update(&bike.chassis);update_snapshot();
        for(n=0;n<120 && !status;n++) {
            lab_step(0,0,0);assert(status!=3);
            if(!first_contact && (rear_grounded || front_grounded))
                first_contact=front_grounded && !rear_grounded?1:2;
        }
        if(status==1 && first_contact==1)for(i=0;i<count;i++)
            if(br_bike_head_hits(&bike,&boards[i]))found=1;
    }
    assert(found);
    printf("PASS: %s hard front-wheel-first landing can crash via original rider collision rules.\n",acro?"Acro":"Regular");
}

static void gentler_drive(int acro)
{
    int i,j;
    const br_bike_def *original=br_bike_def_for(acro?BR_BIKE_ACROBATIC:BR_BIKE_REGULAR);
    for(j=0;j<2;j++) {
        int ticks=j?240:20;
        float original_x,original_speed;
        lab_reset(0,acro);bike.def=original;
        for(i=0;i<ticks;i++)lab_step(0,1,0);
        original_x=lab_get(0);original_speed=lab_get(10);
        lab_reset(0,acro);
        assert(bike.def!=original);
        assert(original->drive==16 && original->drive_cap==44);
        assert(fabsf(bike.def->drive/original->drive-.95f)<1e-6f);
        assert(fabsf(bike.def->drive_cap/original->drive_cap-.95f)<1e-6f);
        for(i=0;i<ticks;i++)lab_step(0,1,0);
        assert(lab_get(14)==0 && lab_get(0)<original_x && lab_get(10)<original_speed);
    }
    for(i=0;i<5;i++)lab_reset(0,acro);
    assert(fabsf(bike.def->drive/original->drive-.95f)<1e-6f);
    printf("PASS: %s 5%% gentler early acceleration and sustained pull; restarts do not compound tuning.\n",acro?"Acro":"Regular");
}

int main(void)
{
    int t,a,n;
    const float tick=1.0f/60;
    gentler_drive(0);gentler_drive(1);
    hard_one_wheel(0);hard_one_wheel(1);
    for(a=0;a<2;a++) {
        float neutral[22];int i;
        lab_reset(0,a);for(i=0;i<120;i++)lab_step(0,0,0);
        for(i=0;i<22;i++)neutral[i]=lab_get(i);
        lab_reset(0,a);for(i=0;i<120;i++)lab_step(i%2?.5f:-.5f,0,0);
        for(i=0;i<22;i++)assert(lab_get(i)==neutral[i]);
        /* Original rules kill when a board crosses either upper-to-wheel
         * connection, even while all three masses remain clear. */
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(-.12f,.44f,-.06f,.44f);
        lab_step(0,0,0);assert(status==1 && !rear_grounded && !front_grounded);
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(.04f,.44f,.105f,.44f);
        lab_step(0,0,0);assert(status==1 && !rear_grounded && !front_grounded);
        /* Crossing the wheel-to-wheel connection adds no collision. */
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(0,.18f,0,.3f);
        lab_step(0,0,0);assert(status==0 && !rear_grounded && !front_grounded);
        /* The upper point still crashes and both wheels still contact. */
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(-.15f,.56f,.15f,.56f);lab_step(0,0,0);assert(status==1);
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(.14f,.2f,.2f,.2f);lab_step(0,0,0);
        assert(status==0 && front_grounded && !rear_grounded);
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(-.23f,.2f,-.17f,.2f);lab_step(0,0,0);
        assert(status==0 && rear_grounded && !front_grounded);
    }
    for(a=0;a<2;a++)for(n=0;n<2;n++) {
        int i;
        lab_reset(0,a);
        for(i=0;i<600;i++)lab_step(0,0,0);
        assert(elapsed==0 && race_started==0 && status==0);
        /* Tilt alone does not start the clock. */
        lab_step(.5f,0,0);assert(elapsed==0 && !race_started && last_lean==0);
        lab_step(.2f,n==0,n==1);
        assert(race_started && fabsf(elapsed-tick)<1e-6f);
        assert(last_lean==.2f && fabsf(lab_get(17))>1e-5f);
        lab_step(0,0,0);assert(fabsf(elapsed-2*tick)<1e-6f);
        lab_reset(0,a);lab_step(.5f,0,0);
        assert(elapsed==0 && !race_started && last_lean==0);
    }
    for(t=0;t<5;t++)for(a=0;a<2;a++) {
        float flag,ground;
        lab_reset(t,a);flag=finish_x;ground=finish_ground_y;
        assert(!race_has_finished(flag+.1f,ground,flag,ground));
        assert(!race_has_finished(flag+.1f,ground-.2f,flag,ground));
        assert(!race_has_finished(flag,ground+.2f,flag,ground));
        assert(!race_has_finished(flag-.1f,ground+.2f,flag,ground));
        assert(race_has_finished(flag+.1f,ground+.2f,flag,ground));
        /* A front wheel beyond the flag does not finish the race. */
        place_upper(flag-.12f,ground+.6f,0);race_started=1;
        assert(bike.front.pos.x>flag);lab_step(0,0,0);assert(status==0);
        lab_reset(t,a);place_upper(flag-.03f,ground-.15f,4);race_started=1;
        lab_step(0,0,0);assert(bike.head.pos.x>flag && status==0);
        /* Rising after a below-ground pass is a valid finish. */
        place_upper(flag+.1f,ground+.6f,4);lab_step(0,0,0);assert(status==2);
        lab_reset(t,a);place_upper(flag-.03f,ground+.6f,4);race_started=1;
        lab_step(0,0,0);assert(bike.head.pos.x>flag && status==2);
        { float final_time=elapsed; lab_step(0,1,0);assert(elapsed==final_time); }
    }
    puts("PASS: first-input clock; head right and above ground, including passing below then rising, on all five courses and both bikes.");
    puts("PASS: original upper-to-wheel crash rules restored; wheel-to-wheel crossing is clear; upper point and wheel contacts retained; pre-start lean stays locked.");
    return 0;
}
