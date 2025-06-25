import api from "./api"; // Your configured Axios instance

const POS_ORDER_API_URL = "/admin/pos/orders"; // Matches backend route

const createOrder = async (orderData) => {
  try {
    const response = await api.post(POS_ORDER_API_URL, orderData);
    return response; // Axios interceptor already returns response.data
  } catch (error) {
    console.error("Error creating POS order:", error);
    throw error; // Re-throw to be caught by the component
  }
};

// Add getOrders, getOrderById if needed for a POS orders listing page

export default {
  createOrder,
};
