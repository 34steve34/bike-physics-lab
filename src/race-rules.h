#ifndef RACE_RULES_H
#define RACE_RULES_H

/* A rightward crossing by the upper physics point. Check its height at
 * the flag plane, so passing below and rising afterward cannot finish. */
static inline int race_crosses_finish(float x0, float y0, float x1, float y1,
                                      float flag_x, float ground_y)
{
    float t, crossing_y;
    if (x0 > flag_x || x1 <= flag_x) return 0;
    t = (flag_x-x0)/(x1-x0);
    crossing_y = y0+(y1-y0)*t;
    return crossing_y > ground_y;
}

#endif
