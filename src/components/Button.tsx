import classnames from "classnames";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({ children, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      className={classnames({
        "inline-flex items-center": true,
        "rounded-md": true,
        "px-6 py-2": true,
        "px-6 py-3": true,
        "bg-indigo-100 text-indigo-700 hover:bg-indigo-200": !disabled,
        "bg-gray-300 text-gray-700 cursor-auto": disabled,
        "focus:outline-none focus:ring-2 focus:ring-indigo-500": !disabled,
        "text-base font-medium": true,
        "transition duration-200": true,
      })}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
