import { ToastStyle } from "../enums";
import { CrewStateType } from "../types";

export abstract class Action<T extends any[]> {
  name = "Action";
  constructor(
    public state: CrewStateType,
    public setState: React.Dispatch<React.SetStateAction<CrewStateType>>
  ) {
    this.state = state;
    this.setState = setState;
  }

  async validateParams(...params): Promise<string | void> {
    return;
  }

  commitState(updates): void {
    return this.setState({
      ...this.state,
      ...updates,
    });
  }

  updateState(...params: T): Partial<CrewStateType> {
    return {};
  }

  async postRun(...params: T): Promise<void> {}

  async run(...params: T): Promise<void> {
    const paramsError = await this.validateParams(...params);
    if (paramsError) {
      this.commitState({
        toast: {
          show: true,
          style: ToastStyle.Error,
          message: paramsError,
        },
      });
      return;
    }

    const stateUpdates = this.updateState(...params);
    this.commitState(stateUpdates);
    this.postRun(...params);
  }
}
