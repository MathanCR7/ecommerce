// src/pages/supportpage/SupportPage.jsx
import React, { useState } from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./SupportPage.css"; // Link the CSS file

const SupportPage = () => {
  // State for Contact Form (basic example - actual submission needs backend)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // *** FORM SUBMISSION LOGIC GOES HERE ***
    // This is where you would typically send the formData to your backend
    // using fetch or a library like axios.
    console.log("Form submitted:", formData);
    alert("Thank you for your message! We will get back to you soon."); // Basic feedback
    setFormData({ name: "", email: "", subject: "", message: "" }); // Clear form
    // ***************************************
  };

  // State for basic Chatbot UI (AI logic is NOT included here)
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "Hi there! How can I assist you with your order or fruit questions today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim() === "") return;

    const userMessage = { sender: "user", text: chatInput };
    setChatMessages([...chatMessages, userMessage]);
    setChatInput("");

    // *** AI CHATBOT LOGIC GOES HERE ***
    // 1. Send userMessage.text to your backend API
    // 2. Backend calls AI service (e.g., OpenAI)
    // 3. Backend sends AI response back
    // 4. Add the AI response as a 'bot' message to chatMessages
    // Example Placeholder (Replace with actual API call):
    setTimeout(() => {
      const botResponse = {
        sender: "bot",
        text: `Thanks for asking about "${userMessage.text}". I'm a demo bot right now, but a real one would give you a great answer!`,
      };
      setChatMessages((prevMessages) => [...prevMessages, botResponse]);
    }, 1000); // Simulate AI thinking time
    // ***********************************
  };

  return (
    <>
      <Header />
      <div className="support-page-container">
        <h1>Customer Support</h1>
        <p className="support-intro">
          Welcome to THE FRUITBOWL & CO Customer Support. We're here to help you
          with any questions you have about our delicious fruit, your orders, or
          anything else!
        </p>

        <section className="faq-section">
          <h2>Frequently Asked Questions (FAQ)</h2>
          <div className="faq-list">
            {/* Use <details>/<summary> for simple collapsible FAQ */}
            <details>
              <summary>How do I place an order?</summary>
              <p>
                Browse our selection, add items to your cart, and proceed to
                checkout. Follow the steps to provide shipping information and
                payment details.
              </p>
            </details>

            <details>
              <summary>What are your shipping options?</summary>
              <p>
                We offer standard and express shipping. Options and estimated
                delivery times are calculated based on your location during
                checkout.
              </p>
            </details>

            <details>
              <summary>What if my fruit arrives damaged?</summary>
              <p>
                Please contact us immediately with photos of the damaged items.
                We will arrange for a replacement or refund as per our return
                policy.
              </p>
            </details>

            <details>
              <summary>Can I modify or cancel my order?</summary>
              <p>
                Orders can be modified or canceled within a short window after
                placing them. Please contact support as soon as possible.
              </p>
            </details>

            <details>
              <summary>How do I store the fruit?</summary>
              <p>
                Storage instructions vary by fruit! Generally, keep most fruits
                cool and away from direct sunlight. Some ripen better on the
                counter (like bananas), while others need refrigeration (like
                berries). Specific tips might be included with your delivery.
              </p>
            </details>
            {/* Add more FAQs here */}
          </div>
        </section>

        <section className="contact-form-section">
          <h2>Get In Touch</h2>
          <p>
            Can't find your answer? Fill out the form below and we'll respond as
            quickly as possible.
          </p>
          <form className="contact-form" onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="subject">Subject:</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message:</label>
              <textarea
                id="message"
                name="message"
                rows="6"
                value={formData.message}
                onChange={handleFormChange}
                required
              ></textarea>
            </div>
            <button type="submit" className="submit-button">
              Send Message
            </button>
          </form>
        </section>

        <section className="chatbot-section">
          <h2>Chat with Our AI Assistant</h2>
          <p>
            Get instant answers to common questions using our automated chat.
          </p>
          <div className="chatbot-container">
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
            <form className="chat-input-form" onSubmit={handleChatSubmit}>
              <input
                type="text"
                placeholder="Type your message..."
                value={chatInput}
                onChange={handleChatInputChange}
              />
              <button type="submit">Send</button>
            </form>
          </div>
          <p className="chatbot-disclaimer">
            Note: This is a demo AI chat. For complex issues, please use the
            contact form or other support methods.
          </p>
        </section>

        {/* Optional: Add other contact methods like phone number, email address */}
        <section className="other-contact-methods">
          <h2>Other Ways to Contact Us</h2>
          <p>
            Email:{" "}
            <a href="mailto:[Your Contact Email]">[Your Contact Email]</a>
          </p>
          <p>Phone: [Your Phone Number (Optional)]</p>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default SupportPage;
