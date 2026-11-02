#ifndef LAB_H
#define LAB_H
void lab_reset(int track, int acro);
void lab_step(float lean, int gas, int brake);
float lab_get(int index);
int lab_board_count(void);
float lab_board_get(int board, int component);
#endif
