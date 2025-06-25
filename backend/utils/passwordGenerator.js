// backend/utils/passwordGenerator.js
import crypto from "crypto";

export const generateRandomPassword = (length = 10) => {
  // Generate a password with a mix of uppercase, lowercase, numbers, and a special character
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specialChars = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
  const allChars = uppercase + lowercase + numbers + specialChars;

  let password = "";
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += specialChars[crypto.randomInt(specialChars.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password to make character positions random
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
};
