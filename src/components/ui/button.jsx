
export function Button({ children, variant = 'primary', ...props }) {
  const base = "px-4 py-2 rounded text-white";
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700",
    secondary: "bg-gray-600 hover:bg-gray-700",
  };
  return <button {...props} className={`${base} ${styles[variant]}`}>{children}</button>;

}
