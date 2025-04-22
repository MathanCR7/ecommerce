import React from "react";

import Search from "./Search";
import Navbar from "./Navbar";
import "./Header.css"; // Import the updated CSS

const Header = ({ cartItems }) => {
  return (
    <>
      <Search cartItems={cartItems} />
      <Navbar />
    </>
  );
};

export default Header;

// If you don't have/need the Head component, just remove the import and <Head /> line.
