export enum Suite {
  None = "",
  Black = "Black",
  Blue = "Blue",
  Red = "Red",
  Yellow = "Yellow",
  Green = "Green",
}

export enum Decoration {
  None,
  Blank,
  Pending,
  Desaturate,
  Grayscale,
  Display,
  Shrink,
}

export enum Communication {
  None,
  NotCommunicated,
  Communicating,
  Lowest,
  Only,
  Highest,
  Cancel,
}

export enum Order {
  None,
  One,
  Two,
  Three,
  Four,
  First,
  Second,
  Third,
  Last,
  LastTrick,
}

export enum Agent {
  None,
  All,
  Current,
  Next,
  Commander,
  Winner,
}

export enum ViewName {
  None,
  Table,
  Trick,
}

export enum GoldenBorder {
  None,
  NotAvailable,
  Available,
  Using,
  Used,
  Skipped,
}

export enum Condition {
  None,
  InProgress,
  Lost,
  Won,
}

export enum Status {
  None,
  NotChosen,
  Chosen,
  Success,
  Failure,
}

export enum ToastStyle {
  Success = "success",
  Error = "error",
}

export enum Size {
  Default = "default",
  Small = "small",
}
