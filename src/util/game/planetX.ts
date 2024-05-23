import { Order } from "../enums";
import { MissionPlanetX } from "./mission";

const missionPlanetX1 = new MissionPlanetX(1);

const missionPlanetX2 = new MissionPlanetX(2);

const missionPlanetX3 = new MissionPlanetX(2, [Order.One, Order.Two]);

const missionPlanetX4 = new MissionPlanetX(3);

const missionPlanetX6 = new MissionPlanetX(
  3,
  [Order.First, Order.Second],
  true
);

const missionPlanetX7 = new MissionPlanetX(1, [Order.Last]);

const missionPlanetX8 = new MissionPlanetX(3, [
  Order.One,
  Order.Two,
  Order.Three,
]);

const missionPlanetX10 = new MissionPlanetX(4);

const missionPlanetX14 = new MissionPlanetX(4, [
  Order.First,
  Order.Second,
  Order.Third,
]);

const missionPlanetX15 = new MissionPlanetX(4, [
  Order.One,
  Order.Two,
  Order.Three,
  Order.Four,
]);

const missionPlanetX21 = new MissionPlanetX(5, [Order.One, Order.Two], true);

const missionPlanetX47 = new MissionPlanetX(10);

const missionPlanetX48 = new MissionPlanetX(3, [Order.LastTrick]);

const missionPlanetX49 = new MissionPlanetX(10, [
  Order.First,
  Order.Second,
  Order.Third,
]);

export const planetX = {
  1: missionPlanetX1,
  2: missionPlanetX2,
  3: missionPlanetX3,
  4: missionPlanetX4,
  6: missionPlanetX6,
  7: missionPlanetX7,
  8: missionPlanetX8,
  10: missionPlanetX10,
  14: missionPlanetX14,
  15: missionPlanetX15,
  21: missionPlanetX21,
  47: missionPlanetX47,
  48: missionPlanetX48,
  49: missionPlanetX49,
};
