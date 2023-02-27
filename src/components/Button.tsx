import classnames from "classnames";
import { Size } from "../util/enums";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: Size;
};

export function Button({
  children,
  onClick,
  disabled,
  active = true,
  size = Size.Default,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={classnames({
        "inline-flex items-center": true,
        "rounded-md": true,
        "px-6 py-2 text-base font-medium": size === Size.Default,
        "px-4 py-2 text-sm font-medium": size === Size.Small,
        "bg-indigo-100 text-indigo-700": active,
        "bg-gray-300 text-gray-700": !active,
        "cursor-auto": disabled,
        "hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500":
          !disabled,
        "transition duration-200": true,
      })}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
