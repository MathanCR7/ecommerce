import React, { useContext } from "react";
import Header from "../../components/Header/Header";
import Registrationform from "../../components/Registrationform/Registrationform";
import Footer from "../../components/Footer/Footer";
import { AuthContext } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

const Registrationpage = () => {
  const { user, loading } = useContext(AuthContext);

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

  // If user is already logged in, redirect them away from registration page (usually to home)
  if (user) {
    return <Navigate to="/" replace />;
  }

  // If not loading and not logged in, show the registration form
  return (
    <>
      <Header />
      <Registrationform />
      <Footer />
    </>
  );
};

export default Registrationpage;
