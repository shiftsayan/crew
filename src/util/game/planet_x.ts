import { Order } from "../enums"
import { Mission } from "./mission"

const planet_x_1 = new Mission(1)

const planet_x_2 = new Mission(2)

const planet_x_3 = new Mission(2, [Order.One, Order.Two])

const planet_x_4 = new Mission(3)

const planet_x_6 = new Mission(3, [Order.First, Order.Second], true)

const planet_x_7 = new Mission(1, [Order.Last])

const planet_x_8 = new Mission(3, [Order.One, Order.Two, Order.Three])

const planet_x_10 = new Mission(4)

const planet_x_14 = new Mission(4, [Order.First, Order.Second, Order.Third])

const planet_x_15 = new Mission(4, [Order.One, Order.Two, Order.Three, Order.Four])

const planet_x_21 = new Mission(5, [Order.One, Order.Two], true)

export const planet_x = {
	1: planet_x_1,
	2: planet_x_2,
	3: planet_x_3,
	4: planet_x_4,
	// 5: planet_x_5,
	6: planet_x_6,
	7: planet_x_7,
	8: planet_x_8,
	// 9: planet_x_9,
	10: planet_x_10,
	// 11: planet_x_11,
	// 12: planet_x_12,
	// 13: planet_x_13,
	14: planet_x_14,
	15: planet_x_15,
	// 18: planet_x_18,
	// 19: planet_x_19,
	// 20: planet_x_20,
	21: planet_x_21,
}
