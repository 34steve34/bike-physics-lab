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
int main(int argc,char **argv) {
    int t,a,n,i,gas,brake; float lean, first[22];
    if(argc>1 && !strcmp(argv[1],"--trace")) {
        int comma=0;printf("[");
        for(t=0;t<4;t++)for(a=0;a<2;a++) {
            lab_reset(t,a);
            for(n=0;n<120;n++) {
                scenario(n,&lean,&gas,&brake);lab_step(lean,gas,brake);
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
