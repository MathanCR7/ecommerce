import { useNavigate } from "react-router-dom";
import shoppingData from "./shoppingData"; // Assuming this data is generic enough
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

const Slidecard = () => {
  const navigate = useNavigate();

  const handleButtonClick = () => {
    // Redirect the user to the desired page
    navigate("/all-items"); // Changed from '/all-products' to '/all-items'
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    // appendDots: (dots) => {
    //   return <ul style={{ margin: "0px" }}>{dots}</ul>;
    // },
  };

  return (
    <>
      <Slider {...settings}>
        {shoppingData.map((value, index) => {
          return (
            <div className="box d_flex top" key={index}>
              <div className="left">
                <h1>{value.title}</h1>
                <p>{value.desc}</p>
                <button
                  onClick={handleButtonClick}
                  className="btn-primary"
                  aria-hidden="false" // Note: aria-hidden="false" is the default and usually not needed explicitly
                >
                  Visit Collections
                </button>
              </div>
              <div className="right">
                <img
                  src={value.cover}
                  alt="slider-image" // Consider a more descriptive alt text if possible, e.g., value.title
                  fetchpriority="high"
                />
              </div>
            </div>
          );
        })}
      </Slider>
    </>
  );
};

export default Slidecard;
