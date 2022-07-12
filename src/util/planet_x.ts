import { Order } from "./enums"

const planet_x_1 = {
	num_goals: 1,
}

const planet_x_2 = {
	num_goals: 2,
}

const planet_x_3 = {
	num_goals: 2,
	orders: [Order.One, Order.Two],
}

const planet_x_4 = {
	num_goals: 3,
}

const planet_x_5 = {
	num_goals: 0,
	sick: 1,
}

const planet_x_6 = {
	num_goals: 3,
	orders: [Order.First, Order.Second],
	dead_spot: true,
}

const planet_x_7 = {
	num_goals: 3,
	orders: [Order.Last],
}

const planet_x_8 = {
	num_goals: 3,
	'orders': ['one', 'two', 'three'],
}

const planet_x_9 = {
	num_goals: 0,
	'win_with_one': 1,
}

const planet_x_10 = {
	num_goals: 4,
}

const planet_x_11 = {
	num_goals: 4,
	'orders': ['one'],
	'non_communicator': 1,
}

const planet_x_12 = {
	num_goals: 4,
	'order': ['last'],
	'exchange_phase': 1
}

const planet_x_13 = {
	num_goals: 0,
	'winners': [
		{ 'num': 1, 'suite': 'black' },
		{ 'num': 2, 'suite': 'black' },
		{ 'num': 3, 'suite': 'black' },
		{ 'num': 4, 'suite': 'black' },
	],
}

const planet_x_14 = {
	num_goals: 4,
	'orders': ['first', 'second', 'third'],
}

const planet_x_15 = {
	num_goals: 4,
	'orders': ['one', 'two', 'three', 'four'],
}


export const planet_x = {
	1: planet_x_1,
	2: planet_x_2,
	3: planet_x_3,
	4: planet_x_4,
	5: planet_x_5,
	6: planet_x_6,
	7: planet_x_7,
	8: planet_x_8,
	9: planet_x_9,
	10: planet_x_10,
	11: planet_x_11,
	12: planet_x_12,
	13: planet_x_13,
	14: planet_x_14,
	15: planet_x_15,
}
