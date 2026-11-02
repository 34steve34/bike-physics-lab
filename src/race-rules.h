#ifndef RACE_RULES_H
#define RACE_RULES_H

/* Only the upper physics point determines the finish. Either condition
 * may become true first: passing below then rising on the far side counts. */
static inline int race_has_finished(float head_x, float head_y,
                                    float flag_x, float ground_y)
{
    return head_x > flag_x && head_y > ground_y;
}

#endif
