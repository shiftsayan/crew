export enum OldPhase {
    Preflight = "PREFLIGHT",
    Goal = "GOAL",
    GoldenBorderDiscard = "GOLDEN_BORDER_DISCARD",
    GoldenBorderAccept = "GOLDEN_BORDER_ACCEPT",
    Communication = "COMMUNICATION",
    StartTrick = "START_TRICK",
    PlayTrick = "PLAY_TRICK",
    Result = "RESULT",
}

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
    DeadSpot,
    Communicating,
    Lowest,
    Only,
    Highest,
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

export enum Move {
    None,
    StartGame,
    ToggleGoal,
    SkipGoldenBorder,
    CommunicateCard,
    CommunicateValue,
    PlayCard,
    StartTrick,
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