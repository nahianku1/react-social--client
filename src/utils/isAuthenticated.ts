export const isAuthenticated = () => {
  const token = localStorage.getItem("authenticated");
  return token === "true";
};
