# 🏦 Basic Banking Web

Welcome to my first banking web project! 🎉  
Hope you enjoy exploring the app. It would be wonderful if you could leave some feedback 🙏  

---

## 🚀 Getting Started

👉 You can access the project here:  
🔗 [basicbankingg.vercel.app/sign-in](https://basicbankingg.vercel.app/sign-in)

⚠️ Note: Sometimes the server may take 2–3 minutes to respond.  
If it doesn’t load, please refresh the link above and sign in again.

### 🧑‍💻 Demo Account
If you don’t want to sign up, you can use the demo account:  
- **Email:** `guest@gmail.com`  
- **Password:** `12345678`

---

## 📝 Sign-up Instructions

If you want to create your own account:

1. **Form requirements:**
   - State must be **NY**.
   - Date of birth must indicate age **18+**.  
   *(Otherwise, the form won’t respond — I haven’t added proper error messages yet 😅)*

2. **Bank connection (via Plaid):**
   - Only US banks are supported.  
   - If you don’t have one, just select **Chase Bank**.  
   - Use the following test account when the Platypus login appears:  
     - **Username:** `user_good`  
     - **Password:** `pass_good`

3. Follow the Plaid steps to complete sign-up.  
   If the app doesn’t redirect you to the homepage, go back to the [sign-in page](https://basicbankingg.vercel.app/sign-in) and log in with your new account.

---

## ✨ Features

### 📌 General
- Left sidebar navigation to switch between pages.  
- On mobile view, use the **menu button (top-right)** to toggle the sidebar.

---

### 🏠 Home Page

**Desktop view:**  
<img width="1045" height="932" alt="Desktop Home Page" src="https://github.com/user-attachments/assets/33c6d351-3512-43d8-bb79-119bca7c3fea" />

**Mobile view:**  
<img width="646" height="935" alt="Mobile Home Page" src="https://github.com/user-attachments/assets/e5c676b3-7ec2-4cd1-8916-4e84087e81c5" />

- View your bank accounts, total balance, and recent transaction history.  
- Click **View All** to go to the Transaction History page.

---

### 🏦 My Banks Page

**Desktop view:**  
<img width="1163" height="938" alt="Desktop My Banks" src="https://github.com/user-attachments/assets/eeca893e-2a2f-41ce-9acf-df6255b48750" />

**Mobile view:**  
<img width="636" height="932" alt="Mobile My Banks" src="https://github.com/user-attachments/assets/ce8ab611-dec3-4739-80a5-8e38881ee2a4" />

- See your bank cards and accounts.  
- Each card has a unique **Plaid Sharable ID** — this is required when someone wants to transfer money to you.  
- More details are available in the **Transfer Funds** page.

---

### 📜 Transactions History

**Desktop view:**  
<img width="1189" height="932" alt="Desktop Transactions" src="https://github.com/user-attachments/assets/6671e3c0-1507-427e-8484-5e5b84b13afb" />

**Mobile view:**  
<img width="598" height="921" alt="Mobile Transactions" src="https://github.com/user-attachments/assets/ba05e483-946c-40a6-9f1f-6833094a2d03" />

- Displays your full transaction history.

---

### 💸 Transfer Funds

**Desktop view:**  
<img width="968" height="929" alt="Desktop Transfer" src="https://github.com/user-attachments/assets/957df93a-8318-451f-a368-b3f3b630dcc0" />

**Mobile view:**  
<img width="521" height="921" alt="Mobile Transfer" src="https://github.com/user-attachments/assets/f529cebb-c7d9-426c-ad19-55b8a1e9d790" />

- Transfer money to another account.  
- Optionally, add a **note** for the receiver.  
- **Important fields:**  
  - Full bank account details.  
  - Receiver’s **Plaid Sharable ID** (from *My Banks* page).  
  - Amount (float values, e.g. `5.00`, `100.00`, `500.00`).  

Transfers take **2 days** to complete since the app uses the **ACH network** in the USA.  
Pending transfers show as **Processing** in the Transaction History:  

<img width="726" height="311" alt="Processing Transfer" src="https://github.com/user-attachments/assets/daef7131-2934-46d0-bac3-e10951b9f9e8" />

---

### 🔗 Connect Bank
<img width="325" height="211" alt="image" src="https://github.com/user-attachments/assets/c0e17ec4-0305-4c35-b9e7-b93e8e1a677b" />


- Add additional bank accounts using Plaid integration.  

---

## 💬 Feedback

I’d really appreciate your feedback! 🙌  
Please share it here:  
👉 [Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLScNfqePKqLDC38yK81tdF6BCOvI5nqwmS-J_cGXbmZAmp1UAg/viewform?usp=header)

---

