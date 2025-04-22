import React, { useContext } from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext"; // May need user info for cart association
import toast from "react-hot-toast";
// import './Cartpage.css'; // Create CSS for styling

const Cartpage = ({
  cartItems = [], // Default to empty array
  addToCart,
  deleteFromCart,
  checkOut,
  removeFromCart,
}) => {
  const { user } = useContext(AuthContext); // Get user context if needed

  // Calculate total price (Example)
  const totalPrice = cartItems.reduce(
    (price, item) => price + item.qty * item.price,
    0
  );

  return (
    <>
      <Header />
      <section className="cart-items">
        <div className="container d_flex">
          <div className="cart-details">
            {cartItems.length === 0 && (
              <h1 className="no-items product">
                Your cart is empty. <Link to="/all-products">Go Shopping!</Link>
              </h1>
            )}

            {cartItems.map((item) => {
              const productQty = item.price * item.qty;
              return (
                <div className="cart-list product d_flex" key={item.id}>
                  <div className="img">
                    <img
                      src={item.cover || "/assets/placeholder.png"}
                      alt={item.name}
                    />{" "}
                    {/* Use placeholder if no image */}
                  </div>
                  <div className="cart-details">
                    <h3>{item.name}</h3>
                    <h4>
                      ${item.price.toFixed(2)} * {item.qty}
                      <span>${productQty.toFixed(2)}</span>
                    </h4>
                  </div>
                  <div className="cart-items-function">
                    <div className="removeCart">
                      <button
                        className="removeCart"
                        onClick={() => removeFromCart(item)}
                      >
                        <i className="fa fa-times"></i> Remove
                      </button>
                    </div>
                    <div className="cartControl d_flex">
                      <button
                        className="incCart"
                        onClick={() => addToCart(item)}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                      <button
                        className="desCart"
                        onClick={() => deleteFromCart(item)}
                      >
                        <i className="fa-solid fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-price"></div>{" "}
                  {/* Might not be needed */}
                </div>
              );
            })}
          </div>

          <div className="cart-total product">
            <h2>Cart Summary</h2>
            <div className="d_flex">
              <h4>Total Price :</h4>
              <h3>${totalPrice.toFixed(2)}</h3>
            </div>
            {/* Add checkout button */}
            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: "20px" }}
              onClick={() => checkOut(cartItems)}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Cartpage;
