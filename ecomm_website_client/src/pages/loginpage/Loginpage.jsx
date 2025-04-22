import React, { useContext } from "react";
import Header from "../../components/Header/Header";
import Loginform from "../../components/Loginform/Loginform";
import Footer from "../../components/Footer/Footer";
import { AuthContext } from "../../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

const Loginpage = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // Determine where to redirect after login (from protected route or home)
  const from = location.state?.from?.pathname || "/";

  // While checking auth status, show loading
  if (loading) {
    return (
      <>
        <Header />
        <div
          className="container"
          style={{
            minHeight: "60vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          Loading...
        </div>
        <Footer />
      </>
    );
  }

  // If user is already logged in, redirect them away from login page
  if (user) {
    return <Navigate to={from} replace />;
  }

  // If not loading and not logged in, show the login form
  return (
    <>
      <Header />
      <Loginform />
      <Footer />
    </>
  );
};

export default Loginpage;
