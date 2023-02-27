import { Order } from "../enums";
import { MissionPlanetX } from "./mission";

const planet_x_1 = new MissionPlanetX(1);

const planet_x_2 = new MissionPlanetX(2);

const planet_x_3 = new MissionPlanetX(2, [Order.One, Order.Two]);

const planet_x_4 = new MissionPlanetX(3);

const planet_x_6 = new MissionPlanetX(3, [Order.First, Order.Second], true);

const planet_x_7 = new MissionPlanetX(1, [Order.Last]);

const planet_x_8 = new MissionPlanetX(3, [Order.One, Order.Two, Order.Three]);

const planet_x_10 = new MissionPlanetX(4);

const planet_x_14 = new MissionPlanetX(4, [
  Order.First,
  Order.Second,
  Order.Third,
]);

const planet_x_15 = new MissionPlanetX(4, [
  Order.One,
  Order.Two,
  Order.Three,
  Order.Four,
]);

const planet_x_21 = new MissionPlanetX(5, [Order.One, Order.Two], true);

const planet_x_47 = new MissionPlanetX(10);

const planet_x_48 = new MissionPlanetX(3, [Order.LastTrick]);

const planet_x_49 = new MissionPlanetX(10, [
  Order.First,
  Order.Second,
  Order.Third,
]);

export const planet_x = {
  1: planet_x_1,
  2: planet_x_2,
  3: planet_x_3,
  4: planet_x_4,
  6: planet_x_6,
  7: planet_x_7,
  8: planet_x_8,
  10: planet_x_10,
  14: planet_x_14,
  15: planet_x_15,
  21: planet_x_21,
  47: planet_x_47,
  48: planet_x_48,
  49: planet_x_49,
};
