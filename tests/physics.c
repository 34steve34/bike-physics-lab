#include "../src/lab.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

static void finite_state(void) {
    int i;
    for(i=0;i<22;i++) assert(isfinite(lab_get(i)));
    assert(lab_get(14)!=3);
}
static void scenario(int frame,float *lean,int *gas,int *brake) {
    *gas=frame<75;*brake=frame>=100;
    *lean=frame>=40 && frame<65 ? 0.09f : frame>=80 && frame<95 ? -0.07f : 0;
}
static void complete_loop(int acro) {
    int n,ceiling=0,left_wall=0,underpass=0;
    float turn=0,previous=0;
    lab_reset(2,acro);
    for(n=0;n<600 && lab_get(14)==0;n++) {
        float angle,delta;
        lab_step(0,1,0); finite_state();
        angle=lab_get(11); delta=angle-previous;
        while(delta>180)delta-=360; while(delta< -180)delta+=360;
        turn+=delta;previous=angle;
        if(!lab_get(22) && lab_get(8)>5.3f && lab_get(8)<6.3f) underpass=1;
        if(lab_get(1)>2.7f && lab_get(3)>2.7f &&
           lab_get(5)<lab_get(1) && lab_get(5)<lab_get(3) &&
           lab_get(12) && lab_get(13)) ceiling=1;
        if(lab_get(22) && lab_get(8)<5.6f && lab_get(12) && lab_get(13))left_wall=1;
    }
    assert(lab_get(14)==2); assert(underpass && ceiling && left_wall);
    assert(turn>340 && turn<380);
    assert(lab_get(4)>15 && lab_get(1)< -0.6f && lab_get(3)< -0.6f);
    printf("PASS: %s inside loop, ceiling contact, full turn, lower exit; %.2fs, %.1f degrees.\n",acro?"Acro":"Regular",lab_get(15),turn);
    lab_reset(2,acro); assert(lab_get(22)==0);
}
static void complete_drop(int acro) {
    int n,airborne=0,landed=0;
    lab_reset(3,acro);
    assert(lab_get(1)>3.7f && lab_get(3)>3.7f);
    for(n=0;n<900 && lab_get(14)==0;n++) {
        lab_step(0,1,0); finite_state();
        if(lab_get(0)>2.1f && !lab_get(12) && !lab_get(13))airborne=1;
        if(airborne && (lab_get(12)||lab_get(13))) {
            assert(lab_get(1)<0.3f || lab_get(3)<0.3f);
            landed=1;
        }
    }
    assert(airborne && landed && lab_get(14)==2);
    printf("PASS: %s larger drop, flat landing and finish; %.2fs.\n",acro?"Acro":"Regular",lab_get(15));
}
int main(int argc,char **argv) {
    int t,a,n,i,gas,brake; float lean, first[22];
    if(argc>1 && !strcmp(argv[1],"--trace")) {
        int comma=0;printf("[");
        for(t=0;t<4;t++)for(a=0;a<2;a++) {
            lab_reset(t,a);
            for(n=0;n<(t==2?360:120);n++) {
                scenario(n,&lean,&gas,&brake);
                if(t==2){lean=0;gas=1;brake=0;}
                lab_step(lean,gas,brake);
                if(n%15==14) {
                    if(comma++)printf(",");printf("[%d,%d,%d",t,a,n);
                    for(i=0;i<22;i++)printf(",%.9g",lab_get(i));printf("]");
                }
            }
        }
        puts("]");return 0;
    }
    lab_reset(0,0);for(n=0;n<600;n++){lab_step(0,0,0);finite_state();}
    assert(lab_get(14)==0);assert(fabsf(lab_get(11))<5);
    assert(lab_get(1)>0.05f && lab_get(1)<0.14f);
    assert(lab_get(3)>0.05f && lab_get(3)<0.14f);
    lab_reset(0,0);for(n=0;n<120;n++)lab_step(0,1,0);
    assert(lab_get(0)>1.0f);assert(lab_get(14)==0);
    for(i=0;i<22;i++)first[i]=lab_get(i);
    lab_reset(0,0);for(n=0;n<120;n++)lab_step(0,1,0);
    for(i=0;i<22;i++)assert(first[i]==lab_get(i));
    /* Persistent forward input on flat ground must not pop a front wheelie. */
    lab_reset(0,0);for(n=0;n<300;n++){lab_step(-0.5f,1,0);finite_state();}
    assert(lab_get(14)==0);assert(fabsf(lab_get(11))<12);
    /* Long, varied runs across both bikes and every original test track. */
    complete_loop(0);complete_loop(1);complete_drop(0);complete_drop(1);
    for(t=0;t<4;t++)for(a=0;a<2;a++)for(i=0;i<3;i++) {
        lab_reset(t,a);
        for(n=0;n<2700;n++){
            lean=i==0?0:(i==1?0.08f*sinf(n*0.02f):0.5f*sinf(n*0.05f));
            lab_step(lean,n%240<180,n%240>=180);finite_state();
        }
    }
    puts("PASS: rest, drive, repeatability, grounded forward lean, 24 long-run scenarios.");
    return 0;
}
