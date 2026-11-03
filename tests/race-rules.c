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

int main(void)
{
    int t,a,n;
    const float tick=1.0f/60;
    for(a=0;a<2;a++) {
        float neutral[22];int i;
        lab_reset(0,a);for(i=0;i<120;i++)lab_step(0,0,0);
        for(i=0;i<22;i++)neutral[i]=lab_get(i);
        lab_reset(0,a);for(i=0;i<120;i++)lab_step(i%2?.5f:-.5f,0,0);
        for(i=0;i<22;i++)assert(lab_get(i)==neutral[i]);
        /* A horizontal board crosses both upper-to-wheel connections,
         * while every mass remains outside its contact radius. */
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(-.12f,.44f,.105f,.44f);
        lab_step(0,0,0);assert(status==0 && !rear_grounded && !front_grounded);
        /* Crossing the wheel-to-wheel connection adds no collision. */
        lab_reset(0,a);place_upper(0,.6f,0);count=0;
        segment(0,.18f,0,.52f);
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
    puts("PASS: connecting lines pass through terrain; upper point crashes, wheel points contact; lean locked until first gas/brake, and relocked on reset.");
    return 0;
}
