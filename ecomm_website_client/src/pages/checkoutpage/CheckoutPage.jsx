// frontend/pages/CheckoutPage/CheckoutPage.jsx
import React, { useState, useEffect, useContext, useMemo } from "react"; // Added useMemo
import { useNavigate, Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  getUserAddressesApi,
  setDefaultAddressApi,
  createOrderApi,
  createRazorpayOrderApi,
  verifyRazorpayPaymentApi,
  checkDeliveryEligibilityApi,
} from "../../services/api";
import AddressCard from "../../components/AddressCard/AddressCard";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./CheckoutPage.css";
import {
  FaMapMarkerAlt,
  FaPlusCircle,
  FaRegCreditCard,
  FaStickyNote,
  FaSpinner,
  FaInfoCircle,
  FaShippingFast,
  FaCalendarAlt,
  // FaClock, // FaClock was not used
  FaStore,
  FaPhone,
} from "react-icons/fa";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay script.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const timeSlots = [
  "10:00 AM - 12:00 PM",
  "12:00 PM - 02:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
  "06:00 PM - 08:00 PM",
];
const BUFFER_MINUTES = 30; // Minimum 30 minutes buffer for today's slots

// Helper function for time slot validity, moved outside component for stability
// or can be memoized if kept inside and depends on component's state/props not used here.
function isTimeSlotValid(slot, selectedDateValue, buffer = 0) {
  if (!selectedDateValue) return false;

  const [timePart] = slot.split(" - "); // "10:00 AM"
  const [time, period] = timePart.split(" "); // "10:00", "AM"
  let [hours, minutes] = time.split(":").map(Number);

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0; // Midnight case for 12 AM

  const slotStartDateTime = new Date(selectedDateValue);
  slotStartDateTime.setHours(hours, minutes, 0, 0);

  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);
  const selectedDateObj = new Date(selectedDateValue); // Create new Date object from string
  selectedDateObj.setHours(0, 0, 0, 0);

  if (selectedDateObj.getTime() === todayDateOnly.getTime()) {
    const nowWithBuffer = new Date(new Date().getTime() + buffer * 60000);
    return slotStartDateTime > nowWithBuffer;
  }
  return true; // For future dates, all slots are initially valid
}

const storeAddressData = {
  contactName: "The Fruit Bowl & Co (Chennai)",
  contactNumber: "+91 98765 43210",
  addressLine:
    "2/53, St, B Sector 8th Cross St, U R Nagar Extension, Pandu Ranga Puram",
  streetNumber: null,
  houseNumber: "2/53",
  floorNumber: null,
  city: "Chennai",
  state: "Tamil Nadu",
  postalCode: "600101",
  country: "India",
  label: "Anna Nagar West Store",
  latitude: 13.0972857,
  longitude: 80.1901805,
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0299918017336!2d80.19018050857461!3d13.097285787176498!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5265aa02ab604f%3A0xccf2d288edfd7abe!2sThe%20Fruit%20Bowl%20Co!5e0!3m2!1sen!2sin!4v17147377238448!5m2!1sen!2sin",
};

const CheckoutPage = ({ allItemsData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useContext(AuthContext);
  const { cartItems, loadingCart, clearCart } = useCart();

  const [addresses, setAddresses] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState("homeDelivery");
  const [deliveryPreferenceType, setDeliveryPreferenceType] = useState("quick");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);

  const appliedPromo = location.state?.appliedPromoFromCart || null;

  const formatPriceToINR = (price) => {
    const numPrice = Number(price);
    return `₹${isNaN(numPrice) ? "0.00" : numPrice.toFixed(2)}`;
  };

  const itemsPrice = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0
      ),
    [cartItems]
  );

  const calculatedDiscountAmount = useMemo(() => {
    let discount = 0;
    const promoCodeString = appliedPromo?.code;
    const promoMinPurchase = Number(appliedPromo?.minPurchase) || 0;
    const promoValue = Number(appliedPromo?.discountAmount) || 0;
    const promoMaxDiscount = Number(appliedPromo?.maxDiscount) || Infinity;

    if (
      appliedPromo &&
      promoCodeString &&
      itemsPrice > 0 &&
      itemsPrice >= promoMinPurchase
    ) {
      if (appliedPromo.discountType === "Percent") {
        discount = (itemsPrice * promoValue) / 100;
        discount = Math.min(discount, promoMaxDiscount);
      } else if (appliedPromo.discountType === "Amount") {
        discount = promoValue;
        discount = Math.min(discount, promoMaxDiscount);
      }
    }
    discount = Math.min(discount, itemsPrice);
    discount = Math.max(0, discount);
    return discount;
  }, [itemsPrice, appliedPromo]);

  const subTotalAfterPromoDiscount = useMemo(
    () => itemsPrice - calculatedDiscountAmount,
    [itemsPrice, calculatedDiscountAmount]
  );

  const { totalCartCgst, totalCartSgst, totalCartGst } = useMemo(() => {
    let cgst = 0;
    let sgst = 0;
    cartItems.forEach((item) => {
      const itemSubtotal =
        (Number(item.price) || 0) * (Number(item.quantity) || 0);
      const itemPromoDiscountShare =
        itemsPrice > 0
          ? (itemSubtotal / itemsPrice) * calculatedDiscountAmount
          : 0;
      let itemTaxableValue = itemSubtotal - itemPromoDiscountShare;
      itemTaxableValue = Math.max(0, itemTaxableValue);
      if (item.isTaxable && itemTaxableValue > 0) {
        const cgstRate = Number(item.cgstRate) || 0;
        const sgstRate = Number(item.sgstRate) || 0;
        cgst += (itemTaxableValue * cgstRate) / 100;
        sgst += (itemTaxableValue * sgstRate) / 100;
      }
    });
    return {
      totalCartCgst: cgst,
      totalCartSgst: sgst,
      totalCartGst: cgst + sgst,
    };
  }, [cartItems, itemsPrice, calculatedDiscountAmount]);

  const deliveryFee = useMemo(() => {
    let fee = 0;
    const freeDeliveryThreshold =
      Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD) || 1000;
    const fixedDeliveryFee =
      Number(import.meta.env.VITE_FIXED_DELIVERY_FEE) || 50;

    if (deliveryOption === "homeDelivery") {
      const amountForDeliveryCheck = subTotalAfterPromoDiscount + totalCartGst;
      const feeThresholdBase = Math.max(0, amountForDeliveryCheck);
      fee = feeThresholdBase >= freeDeliveryThreshold ? 0 : fixedDeliveryFee;
    }
    return fee;
  }, [deliveryOption, subTotalAfterPromoDiscount, totalCartGst]);

  const totalAmount = useMemo(
    () => subTotalAfterPromoDiscount + totalCartGst + deliveryFee,
    [subTotalAfterPromoDiscount, totalCartGst, deliveryFee]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("Please login to proceed to checkout.");
      const redirectTimer = setTimeout(() => {
        navigate("/login", { state: { from: "/checkout" } });
      }, 1000);
      return () => clearTimeout(redirectTimer);
    }
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (user && deliveryOption === "homeDelivery") {
      setLoadingAddresses(true);
      getUserAddressesApi()
        .then((response) => {
          if (response.data.success && Array.isArray(response.data.data)) {
            const fetchedAddresses = response.data.data;
            setAddresses(fetchedAddresses);
            const defaultAddress = fetchedAddresses.find(
              (addr) => addr.isDefault
            );
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress._id);
            } else if (fetchedAddresses.length > 0) {
              setSelectedAddressId(fetchedAddresses[0]._id);
            } else {
              setSelectedAddressId(null);
            }
          } else {
            setAddresses([]);
            setSelectedAddressId(null);
          }
        })
        .catch((error) => {
          console.error("Error fetching addresses:", error);
          toast.error(
            error.response?.data?.message || "Could not load addresses."
          );
          setAddresses([]);
          setSelectedAddressId(null);
        })
        .finally(() => {
          setLoadingAddresses(false);
        });
    } else if (deliveryOption === "selfPickup") {
      setSelectedAddressId(null);
      setLoadingAddresses(false);
    }
  }, [user, deliveryOption]); // Fetch addresses only when user or deliveryOption changes

  // Calculate dateOptions using useMemo
  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split("T")[0];
      const hasValidSlots = timeSlots.some((slot) =>
        isTimeSlotValid(slot, dateString, BUFFER_MINUTES)
      );

      if (hasValidSlots || i > 0) {
        // Include future dates, or today if it has slots
        options.push({
          value: dateString,
          label:
            i === 0
              ? "Today"
              : i === 1
              ? "Tomorrow"
              : date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                }),
          fullLabel: date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        });
      }
    }
    return options;
  }, []); // Empty dependency array: calculated once, or if isTimeSlotValid or timeSlots change, they should be dependencies.
  // Since isTimeSlotValid is stable and timeSlots is const, this is fine for dateOptions.

  // Initialize selectedDate
  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      // Only run if selectedDate is not set and options are available
      const tomorrowISO = new Date(Date.now() + 86400000)
        .toISOString()
        .split("T")[0];
      let defaultDate = tomorrowISO;

      const todayOption = dateOptions.find((opt) => opt.label === "Today");
      if (todayOption) {
        defaultDate = todayOption.value;
      } else if (dateOptions.find((opt) => opt.value === tomorrowISO)) {
        defaultDate = tomorrowISO;
      } else {
        defaultDate = dateOptions[0].value; // Fallback to the first available date
      }
      setSelectedDate(defaultDate);
    }
  }, [dateOptions, selectedDate]); // Depend on dateOptions and selectedDate

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return timeSlots.filter((slot) =>
      isTimeSlotValid(slot, selectedDate, BUFFER_MINUTES)
    );
  }, [selectedDate]); // Depend on selectedDate

  // Initialize or update selectedTimeSlot
  useEffect(() => {
    if (selectedDate) {
      // Only proceed if a date is selected
      if (availableTimeSlots.length > 0) {
        // If current selectedTimeSlot is not valid or not set, pick the first available
        if (
          !selectedTimeSlot ||
          !availableTimeSlots.includes(selectedTimeSlot)
        ) {
          setSelectedTimeSlot(availableTimeSlots[0]);
        }
      } else {
        // No available slots for the selected date
        setSelectedTimeSlot("");
      }
    } else {
      setSelectedTimeSlot(""); // No date selected, so no time slot
    }
  }, [selectedDate, availableTimeSlots, selectedTimeSlot]);

  useEffect(() => {
    if (deliveryOption === "selfPickup" && paymentMethod !== "Online") {
      setPaymentMethod("Online");
    }
  }, [deliveryOption, paymentMethod]);

  const handleSetDefault = async (addressId) => {
    if (!user || !addresses) return; // Guard against null addresses
    const originalAddresses = [...addresses];
    const newAddressesOptimistic = originalAddresses.map((addr) => ({
      ...addr,
      isDefault: addr._id === addressId,
    }));
    setAddresses(newAddressesOptimistic);
    setSelectedAddressId(addressId);

    try {
      const response = await setDefaultAddressApi(addressId);
      if (response.data.success) {
        toast.success("Default address updated!");
        const updatedListResponse = await getUserAddressesApi();
        if (
          updatedListResponse.data.success &&
          Array.isArray(updatedListResponse.data.data)
        ) {
          setAddresses(updatedListResponse.data.data);
          const currentDefault = updatedListResponse.data.data.find(
            (addr) => addr.isDefault
          );
          setSelectedAddressId(
            currentDefault?._id ||
              (updatedListResponse.data.data.length > 0
                ? updatedListResponse.data.data[0]._id
                : null)
          );
        }
      } else {
        setAddresses(originalAddresses);
        const previousDefault = originalAddresses.find(
          (addr) => addr.isDefault
        );
        setSelectedAddressId(
          previousDefault?._id ||
            (originalAddresses.length > 0 ? originalAddresses[0]._id : null)
        );
        toast.error(response.data.message || "Failed to set default address.");
      }
    } catch (error) {
      setAddresses(originalAddresses);
      const previousDefault = originalAddresses.find((addr) => addr.isDefault);
      setSelectedAddressId(
        previousDefault?._id ||
          (originalAddresses.length > 0 ? originalAddresses[0]._id : null)
      );
      toast.error(
        error.response?.data?.message || "Error setting default address."
      );
    }
  };

  if (
    authLoading ||
    loadingCart ||
    (deliveryOption === "homeDelivery" &&
      loadingAddresses &&
      addresses === null)
  ) {
    return (
      <div className="loading-full-page">
        <FaSpinner className="fa-spin" /> Loading Checkout...
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty.");
      navigate("/all-items");
      return;
    }
    setIsSubmittingOrder(true);

    if (deliveryOption === "homeDelivery") {
      if (!selectedAddressId) {
        toast.error("Please select a delivery address.");
        setIsSubmittingOrder(false);
        return;
      }
      const selectedAddress = addresses?.find(
        (addr) => addr._id === selectedAddressId
      );
      if (!selectedAddress) {
        toast.error(
          "Selected address is invalid. Please select another or add a new one."
        );
        setSelectedAddressId(null);
        setIsSubmittingOrder(false);
        return;
      }
      if (
        selectedAddress.longitude == null ||
        selectedAddress.latitude == null
      ) {
        toast.error(
          "Selected address is missing precise location (map coordinates). Please update your address with a precise location to check delivery eligibility, or choose self-pickup.",
          { duration: 8000 }
        );
        setIsSubmittingOrder(false);
        return;
      }
      try {
        const eligibilityResponse = await checkDeliveryEligibilityApi(
          selectedAddressId
        );
        if (!eligibilityResponse.data.eligible) {
          toast.error(
            eligibilityResponse.data.message ||
              "Sorry, we do not deliver to your selected address. Please choose a different address or opt for self-pickup.",
            { duration: 8000 }
          );
          setIsSubmittingOrder(false);
          return;
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Could not verify delivery eligibility at this time. Please try again or contact support.",
          { duration: 8000 }
        );
        setIsSubmittingOrder(false);
        return;
      }
      if (
        deliveryPreferenceType === "scheduled" &&
        (!selectedDate ||
          !selectedTimeSlot ||
          !isTimeSlotValid(selectedTimeSlot, selectedDate, BUFFER_MINUTES))
      ) {
        toast.error(
          "Please select a valid date and time slot for scheduled delivery."
        );
        setIsSubmittingOrder(false);
        return;
      }
    } else if (deliveryOption === "selfPickup") {
      if (
        !selectedDate ||
        !selectedTimeSlot ||
        !isTimeSlotValid(selectedTimeSlot, selectedDate, BUFFER_MINUTES)
      ) {
        toast.error("Please select valid pickup date and time slot.");
        setIsSubmittingOrder(false);
        return;
      }
      if (paymentMethod !== "Online") {
        toast.error("Only online payment is accepted for Self Pickup orders.");
        setPaymentMethod("Online");
        setIsSubmittingOrder(false);
        return;
      }
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method.");
      setIsSubmittingOrder(false);
      return;
    }
    if (paymentMethod === "Online" && totalAmount <= 0.01 && itemsPrice > 0) {
      toast.error(
        "Online payment is not available for this order amount. Please select COD if available or adjust your cart."
      );
      setIsSubmittingOrder(false);
      return;
    }

    const orderPayloadForVerification = {
      orderItems: cartItems.map((item) => {
        const fullItemDetails =
          allItemsData?.find((ai) => ai._id === item._id) || item;
        let displayImagePath = "/assets/images/placeholder-item.png";
        if (
          fullItemDetails.images &&
          Array.isArray(fullItemDetails.images) &&
          fullItemDetails.images.length > 0
        ) {
          const primaryImg = fullItemDetails.images.find(
            (img) => img.isPrimary
          );
          displayImagePath = primaryImg
            ? primaryImg.path
            : fullItemDetails.images[0].path;
        } else if (fullItemDetails.imagePath) {
          displayImagePath = fullItemDetails.imagePath;
        } else if (item.image) {
          displayImagePath = item.image;
        }
        return {
          item: item._id,
          name: fullItemDetails.name || item.name || "Item Name Unavailable",
          quantity: Number(item.quantity) || 0,
          priceAtPurchase:
            Number(fullItemDetails.price) || Number(item.price) || 0,
          image: displayImagePath,
          unit: fullItemDetails.unit || item.unit,
          mrpAtPurchase:
            Number(fullItemDetails.mrp) ||
            Number(item.mrp) ||
            Number(fullItemDetails.price) ||
            Number(item.price) ||
            0,
          cgstRate:
            Number(fullItemDetails.cgstRate) || Number(item.cgstRate) || 0,
          sgstRate:
            Number(fullItemDetails.sgstRate) || Number(item.sgstRate) || 0,
          isTaxable:
            fullItemDetails.isTaxable === true || item.isTaxable === true,
        };
      }),
      deliveryOption: deliveryOption,
      promoCode: appliedPromo?.code ? { code: appliedPromo.code } : null,
      orderNotes: deliveryNote,
    };

    if (deliveryOption === "homeDelivery") {
      orderPayloadForVerification.shippingAddressId = selectedAddressId;
      orderPayloadForVerification.deliveryPreferenceType =
        deliveryPreferenceType;
      if (deliveryPreferenceType === "scheduled") {
        orderPayloadForVerification.scheduledDate = selectedDate;
        orderPayloadForVerification.scheduledTimeSlot = selectedTimeSlot;
      }
      orderPayloadForVerification.paymentMethod = paymentMethod;
    } else if (deliveryOption === "selfPickup") {
      orderPayloadForVerification.scheduledDate = selectedDate;
      orderPayloadForVerification.scheduledTimeSlot = selectedTimeSlot;
      orderPayloadForVerification.paymentMethod = "Online";
    }

    if (paymentMethod === "COD") {
      try {
        const { data } = await createOrderApi(orderPayloadForVerification);
        if (data && data._id) {
          toast.success("Order placed successfully!");
          if (typeof clearCart === "function") clearCart();
          navigate(`/my-orders/${data._id}`);
        } else {
          throw new Error(
            data?.message || "Order placement failed. No order ID returned."
          );
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to place COD order."
        );
      } finally {
        setIsSubmittingOrder(false);
      }
    } else if (paymentMethod === "Online") {
      setIsRazorpayLoading(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error("Payment script failed to load. Please try again.");
          setIsSubmittingOrder(false);
          setIsRazorpayLoading(false);
          return;
        }
        const amountInPaiseToSend = Math.round(totalAmount * 100);
        if (amountInPaiseToSend <= 0 && itemsPrice > 0) {
          toast.error(
            "Cannot proceed with online payment for zero or negative amount if items have value."
          );
          setIsSubmittingOrder(false);
          setIsRazorpayLoading(false);
          return;
        }
        const razorpayOrderCreationPayload = {
          amount: amountInPaiseToSend,
          currency: import.meta.env.VITE_RAZORPAY_CURRENCY || "INR",
          shippingAddressId:
            deliveryOption === "homeDelivery" ? selectedAddressId : null,
          deliveryOption: deliveryOption,
          notes: {
            orderNotes: deliveryNote,
            userId: user?._id?.toString(),
            clientDeliveryOption: deliveryOption,
            clientDeliveryPreferenceType:
              deliveryOption === "homeDelivery"
                ? deliveryPreferenceType
                : "pickupScheduled",
            ...((deliveryOption === "homeDelivery" &&
              deliveryPreferenceType === "scheduled") ||
            deliveryOption === "selfPickup"
              ? {
                  clientScheduledDate: selectedDate,
                  clientScheduledTimeSlot: selectedTimeSlot,
                }
              : {}),
          },
        };
        const razorpayOrderResponse = await createRazorpayOrderApi(
          razorpayOrderCreationPayload
        );
        if (!razorpayOrderResponse.data || !razorpayOrderResponse.data.id) {
          throw new Error(
            razorpayOrderResponse.data?.message ||
              "Failed to create Razorpay order."
          );
        }
        const {
          id: order_id,
          currency,
          amount: amountInPaiseFromRzp,
        } = razorpayOrderResponse.data;
        if (amountInPaiseFromRzp !== amountInPaiseToSend) {
          throw new Error(
            "Payment amount mismatch during order creation. Please try again."
          );
        }
        const rzpThemeColor =
          import.meta.env.VITE_RAZORPAY_THEME_COLOR || "#28a745";
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: amountInPaiseFromRzp,
          currency: currency,
          name: "The FruitBowl & Co",
          description: `Order Payment (Total: ${formatPriceToINR(
            totalAmount
          )})`,
          order_id: order_id,
          handler: async function (response) {
            setIsRazorpayLoading(false);
            const paymentDetails = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };
            try {
              const verificationResponse = await verifyRazorpayPaymentApi({
                paymentDetails: paymentDetails,
                orderPayload: orderPayloadForVerification,
              });
              if (
                verificationResponse.data &&
                verificationResponse.data.success &&
                verificationResponse.data.orderId
              ) {
                toast.success("Payment successful! Order placed.");
                if (typeof clearCart === "function") clearCart();
                navigate(`/my-orders/${verificationResponse.data.orderId}`);
              } else {
                toast.error(
                  verificationResponse.data?.message ||
                    "Payment verification failed."
                );
                navigate("/my-orders");
              }
            } catch (error) {
              toast.error(
                error.response?.data?.message ||
                  "Error during payment verification."
              );
              navigate("/my-orders");
            } finally {
              setIsSubmittingOrder(false);
            }
          },
          "modal.ondismiss": function () {
            if (isRazorpayLoading) {
              toast("Payment cancelled by user.", { icon: "✋" });
            }
            setIsSubmittingOrder(false);
            setIsRazorpayLoading(false);
          },
          prefill: {
            name: user?.displayName || user?.username || "",
            email: user?.email || "",
            contact:
              (deliveryOption === "homeDelivery" &&
                selectedAddressId &&
                addresses?.find((addr) => addr._id === selectedAddressId)
                  ?.contactNumber) ||
              user?.phoneNumber ||
              (deliveryOption === "selfPickup"
                ? storeAddressData.contactNumber
                : ""),
          },
          notes: {
            userId: user?._id?.toString(),
            checkoutDeliveryOption: deliveryOption,
            checkoutPaymentMethod: paymentMethod,
          },
          theme: { color: rzpThemeColor },
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.on("payment.failed", function (response) {
          console.error("Razorpay payment.failed event:", response);
          toast.error(
            response.error?.description ||
              "Payment failed. Please try again or choose another method."
          );
          setIsSubmittingOrder(false);
          setIsRazorpayLoading(false);
        });
        rzp1.open();
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to initiate online payment."
        );
        setIsSubmittingOrder(false);
        setIsRazorpayLoading(false);
      }
    }
  };

  const isButtonDisabled =
    isSubmittingOrder ||
    isRazorpayLoading ||
    cartItems.length === 0 ||
    loadingCart ||
    (deliveryOption === "homeDelivery" &&
      addresses === null &&
      loadingAddresses) ||
    (deliveryOption === "homeDelivery" &&
      addresses !== null &&
      (addresses.length === 0 || !selectedAddressId)) ||
    (((deliveryOption === "homeDelivery" &&
      deliveryPreferenceType === "scheduled") ||
      deliveryOption === "selfPickup") &&
      (!selectedDate ||
        !selectedTimeSlot ||
        (selectedTimeSlot &&
          !isTimeSlotValid(selectedTimeSlot, selectedDate, BUFFER_MINUTES)))) ||
    (dateOptions.length === 0 &&
      (deliveryOption === "selfPickup" ||
        (deliveryOption === "homeDelivery" &&
          deliveryPreferenceType === "scheduled"))) ||
    (selectedDate &&
      dateOptions.some((opt) => opt.value === selectedDate) &&
      availableTimeSlots.length === 0 &&
      ((deliveryOption === "homeDelivery" &&
        deliveryPreferenceType === "scheduled") ||
        deliveryOption === "selfPickup")) ||
    (paymentMethod === "Online" && totalAmount <= 0.01 && itemsPrice > 0);

  const buttonText = isSubmittingOrder ? (
    <>
      <FaSpinner className="fa-spin" />{" "}
      {isRazorpayLoading ? "Processing Payment..." : "Placing Order..."}
    </>
  ) : paymentMethod === "Online" && (totalAmount > 0.01 || itemsPrice === 0) ? (
    "Proceed to Pay " + formatPriceToINR(totalAmount)
  ) : (
    "Place Order"
  );

  return (
    <>
      <Header
        cartItemCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
      />
      <main className="checkout-page-main-wrapper container">
        <h1>Checkout</h1>
        <div className="checkout-layout">
          <div className="checkout-left-column">
            {/* Delivery Option Section */}
            <div className="checkout-section delivery-option-section">
              <h2>Delivery Option</h2>
              <div className="radio-group">
                <label
                  className={`radio-option ${
                    deliveryOption === "homeDelivery" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryOption"
                    value="homeDelivery"
                    checked={deliveryOption === "homeDelivery"}
                    onChange={(e) => setDeliveryOption(e.target.value)}
                    disabled={isSubmittingOrder || isRazorpayLoading}
                  />
                  <span className="radio-custom-indicator"></span> Home Delivery{" "}
                  <FaShippingFast style={{ marginLeft: "5px" }} />
                </label>
                <label
                  className={`radio-option ${
                    deliveryOption === "selfPickup" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryOption"
                    value="selfPickup"
                    checked={deliveryOption === "selfPickup"}
                    onChange={(e) => setDeliveryOption(e.target.value)}
                    disabled={isSubmittingOrder || isRazorpayLoading}
                  />
                  <span className="radio-custom-indicator"></span> Self Pickup @
                  Store <FaStore style={{ marginLeft: "5px" }} />
                </label>
              </div>
            </div>

            {deliveryOption === "homeDelivery" && (
              <div className="checkout-section delivery-address-section">
                <div className="section-header">
                  <h2>Delivery To</h2>
                </div>
                {loadingAddresses && addresses === null ? (
                  <div className="loading-state">
                    <FaSpinner className="fa-spin" /> Loading addresses...
                  </div>
                ) : addresses && addresses.length > 0 ? (
                  <>
                    <Link
                      to={`/profile/addresses/new?redirect=${encodeURIComponent(
                        location.pathname + location.search
                      )}`}
                      className="btn-add-address-checkout"
                    >
                      <FaPlusCircle /> Add New
                    </Link>
                    <div className="address-list-checkout">
                      {addresses.map((addr) => (
                        <div
                          key={addr._id}
                          className={`address-item-selectable ${
                            selectedAddressId === addr._id ? "selected" : ""
                          }`}
                          onClick={() => {
                            if (!isSubmittingOrder && !isRazorpayLoading)
                              setSelectedAddressId(addr._id);
                          }}
                        >
                          <input
                            type="radio"
                            name="selectedAddress"
                            id={`addr-${addr._id}`}
                            value={addr._id}
                            checked={selectedAddressId === addr._id}
                            onChange={() => setSelectedAddressId(addr._id)}
                            className="address-radio-input"
                            disabled={isSubmittingOrder || isRazorpayLoading}
                          />
                          <label
                            htmlFor={`addr-${addr._id}`}
                            className="address-radio-label"
                          >
                            <AddressCard
                              address={addr}
                              disableActions={
                                isSubmittingOrder || isRazorpayLoading
                              }
                              onEdit={() =>
                                navigate(
                                  `/profile/addresses/edit/${
                                    addr._id
                                  }?redirect=${encodeURIComponent(
                                    location.pathname + location.search
                                  )}`
                                )
                              }
                              onDelete={null}
                              onSetDefault={handleSetDefault}
                              isDefault={addr.isDefault}
                              isSelected={selectedAddressId === addr._id}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="no-address-info">
                    <FaMapMarkerAlt />
                    <p>No delivery addresses found.</p>
                    <Link
                      to={`/profile/addresses/new?redirect=${encodeURIComponent(
                        location.pathname + location.search
                      )}`}
                      className="btn-primary"
                      style={{ marginTop: "10px" }}
                    >
                      Add an Address
                    </Link>
                  </div>
                )}
                {addresses !== null &&
                  addresses.length > 0 &&
                  !selectedAddressId && (
                    <p className="warning-text" style={{ marginTop: "10px" }}>
                      <FaInfoCircle /> Please select a delivery address.
                    </p>
                  )}
                {addresses !== null &&
                  addresses.length === 0 &&
                  !loadingAddresses && (
                    <p className="warning-text" style={{ marginTop: "10px" }}>
                      <FaInfoCircle /> You need to add an address for Home
                      Delivery.
                    </p>
                  )}
              </div>
            )}

            {deliveryOption === "selfPickup" && (
              <div className="checkout-section store-location-section">
                <h2>Pickup Location</h2>
                {storeAddressData.addressLine ? (
                  <div className="store-address-display">
                    <FaStore className="store-icon" />
                    <div className="address-details">
                      <h3>{storeAddressData.label || "Store Location"}</h3>
                      <p>{storeAddressData.addressLine}</p>
                      <p>{`${storeAddressData.city}, ${storeAddressData.state} ${storeAddressData.postalCode}`}</p>
                      {storeAddressData.contactName &&
                        storeAddressData.contactNumber && (
                          <p className="contact-info">
                            Contact: {storeAddressData.contactName}{" "}
                            <FaPhone style={{ marginLeft: "5px" }} />{" "}
                            {storeAddressData.contactNumber}
                          </p>
                        )}
                    </div>
                  </div>
                ) : (
                  <p className="warning-text">
                    <FaInfoCircle /> Store location details unavailable.
                  </p>
                )}
                {storeAddressData.mapEmbedUrl && (
                  <div className="store-map-embed">
                    <iframe
                      src={storeAddressData.mapEmbedUrl}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Store Location Map"
                    ></iframe>
                  </div>
                )}
              </div>
            )}

            <div className="checkout-section delivery-preference-section">
              <h2>
                Add {deliveryOption === "selfPickup" ? "Pickup" : "Delivery"}{" "}
                Details
              </h2>
              {deliveryOption === "homeDelivery" && (
                <>
                  <h3>Delivery Type</h3>
                  <div className="radio-group">
                    <label
                      className={`radio-option ${
                        deliveryPreferenceType === "quick" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryPreference"
                        value="quick"
                        checked={deliveryPreferenceType === "quick"}
                        onChange={(e) =>
                          setDeliveryPreferenceType(e.target.value)
                        }
                        disabled={isSubmittingOrder || isRazorpayLoading}
                      />
                      <span className="radio-custom-indicator"></span> Quick
                      Delivery <FaShippingFast style={{ marginLeft: "5px" }} />
                    </label>
                    <label
                      className={`radio-option ${
                        deliveryPreferenceType === "scheduled" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryPreference"
                        value="scheduled"
                        checked={deliveryPreferenceType === "scheduled"}
                        onChange={(e) =>
                          setDeliveryPreferenceType(e.target.value)
                        }
                        disabled={isSubmittingOrder || isRazorpayLoading}
                      />
                      <span className="radio-custom-indicator"></span> Scheduled
                      Delivery <FaCalendarAlt style={{ marginLeft: "5px" }} />
                    </label>
                  </div>
                </>
              )}
              {((deliveryOption === "homeDelivery" &&
                deliveryPreferenceType === "scheduled") ||
                deliveryOption === "selfPickup") && (
                <div className="scheduled-options">
                  <h3>
                    Select{" "}
                    {deliveryOption === "selfPickup"
                      ? "Preferred Pickup"
                      : "Scheduled Delivery"}{" "}
                    Date & Time Slot
                  </h3>
                  <div className="date-options radio-group horizontal">
                    {dateOptions.length > 0 ? (
                      dateOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`radio-option date-option ${
                            selectedDate === option.value ? "selected" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="scheduledDate"
                            value={option.value}
                            checked={selectedDate === option.value}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            disabled={isSubmittingOrder || isRazorpayLoading}
                          />
                          <span className="radio-custom-indicator"></span>{" "}
                          {option.label}
                        </label>
                      ))
                    ) : (
                      <p className="info-text" style={{ width: "100%" }}>
                        No dates available for scheduled{" "}
                        {deliveryOption === "selfPickup"
                          ? "pickup"
                          : "delivery"}
                        .
                      </p>
                    )}
                  </div>
                  {dateOptions.length > 0 &&
                    selectedDate &&
                    (availableTimeSlots.length > 0 ? (
                      <div className="time-slot-options radio-group horizontal">
                        {availableTimeSlots.map((slot) => (
                          <label
                            key={slot}
                            className={`radio-option time-slot-option ${
                              selectedTimeSlot === slot ? "selected" : ""
                            } ${
                              !isTimeSlotValid(
                                slot,
                                selectedDate,
                                BUFFER_MINUTES
                              )
                                ? "disabled-option"
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="scheduledTimeSlot"
                              value={slot}
                              checked={selectedTimeSlot === slot}
                              onChange={(e) =>
                                setSelectedTimeSlot(e.target.value)
                              }
                              disabled={
                                isSubmittingOrder ||
                                isRazorpayLoading ||
                                !isTimeSlotValid(
                                  slot,
                                  selectedDate,
                                  BUFFER_MINUTES
                                )
                              }
                            />
                            <span className="radio-custom-indicator"></span>{" "}
                            {slot}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="info-text"
                        style={{ width: "100%", marginTop: "10px" }}
                      >
                        No time slots available for the selected date.
                      </p>
                    ))}
                  {((deliveryOption === "homeDelivery" &&
                    deliveryPreferenceType === "scheduled") ||
                    deliveryOption === "selfPickup") &&
                    dateOptions.length > 0 &&
                    (!selectedDate ||
                      !selectedTimeSlot ||
                      (selectedTimeSlot &&
                        !isTimeSlotValid(
                          selectedTimeSlot,
                          selectedDate,
                          BUFFER_MINUTES
                        ))) &&
                    (availableTimeSlots.length > 0 ||
                      !selectedDate ||
                      (selectedDate &&
                        availableTimeSlots.length === 0 &&
                        timeSlots.some((ts) =>
                          isTimeSlotValid(ts, selectedDate, BUFFER_MINUTES)
                        ))) &&
                    !(
                      selectedDate &&
                      availableTimeSlots.length === 0 &&
                      !timeSlots.some((ts) =>
                        isTimeSlotValid(ts, selectedDate, BUFFER_MINUTES)
                      )
                    ) && (
                      <p className="warning-text" style={{ marginTop: "10px" }}>
                        <FaInfoCircle /> Please select a valid date and time
                        slot.
                      </p>
                    )}
                </div>
              )}
              {deliveryOption === "homeDelivery" &&
                deliveryPreferenceType === "quick" && (
                  <p className="quick-delivery-info">
                    <FaInfoCircle /> Estimated delivery: Typically within 90
                    minutes.
                  </p>
                )}
            </div>

            <div className="checkout-section delivery-note-section">
              <h2>
                Add {deliveryOption === "selfPickup" ? "Pickup" : "Delivery"}{" "}
                Note (Optional)
              </h2>
              <textarea
                placeholder={`Type any special instructions...`}
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                rows="3"
                disabled={isSubmittingOrder || isRazorpayLoading}
              ></textarea>
            </div>

            <div className="checkout-section payment-method-section">
              <h2>Payment Method</h2>
              <div className="payment-options radio-group">
                {deliveryOption === "homeDelivery" &&
                  (totalAmount > 0.01 || itemsPrice === 0) && (
                    <label
                      className={`radio-option ${
                        paymentMethod === "COD" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        disabled={isSubmittingOrder || isRazorpayLoading}
                      />
                      <span className="radio-custom-indicator"></span> Cash on
                      Delivery <FaStickyNote style={{ marginLeft: "5px" }} />
                    </label>
                  )}
                <label
                  className={`radio-option ${
                    paymentMethod === "Online" ? "selected" : ""
                  } ${
                    totalAmount <= 0.01 && itemsPrice > 0
                      ? "disabled-option"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Online"
                    checked={paymentMethod === "Online"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={
                      (totalAmount <= 0.01 && itemsPrice > 0) ||
                      isSubmittingOrder ||
                      isRazorpayLoading ||
                      (deliveryOption === "selfPickup" &&
                        paymentMethod !== "Online")
                    }
                  />
                  <span className="radio-custom-indicator"></span> Online
                  Payment (Razorpay){" "}
                  <FaRegCreditCard style={{ marginLeft: "5px" }} />
                </label>
              </div>
              {deliveryOption === "selfPickup" && (
                <p className="info-text" style={{ marginTop: "10px" }}>
                  <FaInfoCircle /> Online payment required for Self Pickup.
                </p>
              )}
              {paymentMethod === "Online" &&
                (totalAmount > 0.01 || itemsPrice === 0) && (
                  <p className="info-text" style={{ marginTop: "10px" }}>
                    <FaInfoCircle /> You will be redirected to Razorpay for
                    secure payment.
                  </p>
                )}
              {totalAmount <= 0.01 && itemsPrice > 0 && (
                <p className="warning-text" style={{ marginTop: "10px" }}>
                  <FaInfoCircle /> Total is {formatPriceToINR(totalAmount)}.
                  Online payment unavailable.{" "}
                  {deliveryOption === "homeDelivery"
                    ? "Select COD."
                    : "Please adjust cart or contact support."}
                </p>
              )}
            </div>
          </div>

          <div className="checkout-right-column">
            <div className="checkout-section cost-summary-checkout">
              <h2>
                Order Summary (
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)} items)
              </h2>
              <div className="cost-row">
                <span>
                  {deliveryOption === "homeDelivery" ? "Delivery" : "Pickup"}{" "}
                  Option:
                </span>
                <span>
                  {deliveryOption === "homeDelivery"
                    ? "Home Delivery"
                    : "Self Pickup"}
                </span>
              </div>
              {deliveryOption === "homeDelivery" && (
                <div className="cost-row">
                  <span>Delivery Type:</span>
                  <span>
                    {deliveryPreferenceType === "quick" ? "Quick" : "Scheduled"}
                  </span>
                </div>
              )}
              {((deliveryOption === "homeDelivery" &&
                deliveryPreferenceType === "scheduled") ||
                deliveryOption === "selfPickup") &&
                selectedDate &&
                selectedTimeSlot &&
                isTimeSlotValid(
                  selectedTimeSlot,
                  selectedDate,
                  BUFFER_MINUTES
                ) &&
                dateOptions.length > 0 &&
                availableTimeSlots.length > 0 && (
                  <div className="cost-row">
                    <span>
                      {deliveryOption === "homeDelivery"
                        ? "Scheduled Time"
                        : "Pickup Time"}
                      :
                    </span>
                    <span>{`${new Date(selectedDate).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" }
                    )} - ${selectedTimeSlot}`}</span>
                  </div>
                )}
              <div className="cost-divider"></div>
              <div className="cost-row">
                <span>Items Subtotal:</span>
                <span>{formatPriceToINR(itemsPrice)}</span>
              </div>
              {calculatedDiscountAmount > 0.009 && (
                <div className="cost-row discount">
                  <span>Discount ({appliedPromo?.code || "Promo"}):</span>
                  <span>- {formatPriceToINR(calculatedDiscountAmount)}</span>
                </div>
              )}
              {calculatedDiscountAmount > 0.009 && (
                <div className="cost-row">
                  <span>Price After Discount:</span>
                  <span>{formatPriceToINR(subTotalAfterPromoDiscount)}</span>
                </div>
              )}
              {totalCartCgst > 0.009 && (
                <div className="cost-row">
                  <span>Total CGST:</span>
                  <span>+ {formatPriceToINR(totalCartCgst)}</span>
                </div>
              )}
              {totalCartSgst > 0.009 && (
                <div className="cost-row">
                  <span>Total SGST:</span>
                  <span>+ {formatPriceToINR(totalCartSgst)}</span>
                </div>
              )}
              {itemsPrice > 0 &&
                totalCartCgst < 0.009 &&
                totalCartSgst < 0.009 && (
                  <div className="cost-row">
                    <span>Tax:</span>
                    <span>{formatPriceToINR(0)}</span>
                  </div>
                )}
              {deliveryOption === "homeDelivery" && (
                <div className="cost-row">
                  <span>Delivery Fee:</span>
                  <span>
                    {deliveryFee > 0 ? formatPriceToINR(deliveryFee) : "FREE"}
                  </span>
                </div>
              )}
              <hr className="cost-divider" />
              <div className="cost-row total">
                <strong>Total Payable:</strong>
                <strong>{formatPriceToINR(totalAmount)}</strong>
              </div>
              <button
                className="btn-place-order"
                onClick={handlePlaceOrder}
                disabled={isButtonDisabled}
              >
                {buttonText}
              </button>
              {cartItems.length === 0 && (
                <p className="warning-text" style={{ marginTop: "10px" }}>
                  <FaInfoCircle /> Your cart is empty. Add items to proceed.
                </p>
              )}
              {paymentMethod === "Online" &&
                totalAmount <= 0.01 &&
                itemsPrice > 0 && (
                  <p className="warning-text" style={{ marginTop: "10px" }}>
                    <FaInfoCircle /> Total is {formatPriceToINR(totalAmount)}.
                    Online payment unavailable for this amount.
                  </p>
                )}
              {deliveryOption === "homeDelivery" &&
                addresses !== null &&
                (addresses.length === 0 || !selectedAddressId) &&
                !isSubmittingOrder &&
                !isRazorpayLoading && (
                  <p className="warning-text" style={{ marginTop: "10px" }}>
                    <FaInfoCircle /> Please select or add a delivery address to
                    proceed.
                  </p>
                )}
              {((deliveryOption === "homeDelivery" &&
                deliveryPreferenceType === "scheduled") ||
                deliveryOption === "selfPickup") &&
                (dateOptions.length === 0 ||
                  !selectedDate ||
                  !selectedTimeSlot ||
                  (selectedTimeSlot &&
                    !isTimeSlotValid(
                      selectedTimeSlot,
                      selectedDate,
                      BUFFER_MINUTES
                    ))) &&
                !isSubmittingOrder &&
                !isRazorpayLoading && (
                  <p className="warning-text" style={{ marginTop: "10px" }}>
                    <FaInfoCircle /> Please select a valid date and time slot.
                  </p>
                )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CheckoutPage;
