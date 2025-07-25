import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // "document.documentElement.scrollTo" is the magic for React Router v6
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // Optional: Use "auto" or "smooth" for scrolling behavior
    });
  }, [pathname]); // Effect triggers on route change

  return null; // This component does not render anything
}

export default ScrollToTop;
