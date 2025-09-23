Welcome to my first banking web, hope you enjoy my app. It would be wonderful if you can leave a feedback about my app 

## Getting Started
You can access this project on vercel link: basicbankingg.vercel.app/sign-in. 
Unfortunately, I haven't done on fix some error so if it doesnt response in 2 3 minutes, please go back the link i have paste and sign-in again :((

Sign-up will need some special step so if you don't want to do it, i have created this account for you to try: email: guest@gmail.com, pass: 12345678

### If you want to sign-up your own account, here's tutorial:

You can sign up freely but please notice that state field need to be 'NY', dateofbirth need to be 18+, otherwise the web won't response, im haven't add notice line :(

After submit form, you need to connect your bank account with plaid. Because plaid just have America Banks so if you dont use those banks, just choose chase bank, when platypus link appear, you can access this account: user_good pass: pass_good. Then follow plaid step to complete sign-up.

After finished connect bank account, if it doesn't redirect to the home page, please go back to the sign-in link and sign-in with your new account.


## Feature
On the leftsidebar, you can choose which page you want to show
In Mobile View, there's an menu button on the top right, when you need to show the leftsidebar, click that button
### Home Page
Desktop view: <img width="1045" height="932" alt="image" src="https://github.com/user-attachments/assets/33c6d351-3512-43d8-bb79-119bca7c3fea" />
Mobile view: <img width="646" height="935" alt="image" src="https://github.com/user-attachments/assets/e5c676b3-7ec2-4cd1-8916-4e84087e81c5" />

In Mobile View, there's an menu button on the top right, when you need to show the menu list, click that button

In this page, you can see your bank account, total balance from all of your banks and transactions history which you were made in the past.

"View all" button will redirect you to the Transaction History page, where you can see the hole Transactions you were made.

### My Banks Page
Desktop view: <img width="1163" height="938" alt="image" src="https://github.com/user-attachments/assets/eeca893e-2a2f-41ce-9acf-df6255b48750" />
Mobile view: <img width="636" height="932" alt="image" src="https://github.com/user-attachments/assets/ce8ab611-dec3-4739-80a5-8e38881ee2a4" />

In this page, you can see Your cards, your bank accounts

Below each cards will have an id of that card. If someone want to transfer money to your accounts, they need to use this id to transfer. Transfer Funds page will describe it fully.


### Transactions History Page
Desktop view: <img width="1189" height="932" alt="image" src="https://github.com/user-attachments/assets/6671e3c0-1507-427e-8484-5e5b84b13afb" />
Mobile view: <img width="598" height="921" alt="image" src="https://github.com/user-attachments/assets/ba05e483-946c-40a6-9f1f-6833094a2d03" />

This page show your account Transaction History 

### Transfer Funds
Desktop view: <img width="968" height="929" alt="image" src="https://github.com/user-attachments/assets/957df93a-8318-451f-a368-b3f3b630dcc0" />
Mobile view: <img width="521" height="921" alt="image" src="https://github.com/user-attachments/assets/f529cebb-c7d9-426c-ad19-55b8a1e9d790" />

This is an interesting page, where you can transfer your money to someone else
When transfer, you can leave note to that person or not (Optional)

The important information is the Bank account details, you need to enter full information so it can successfully transfer

The receiver's Plaid Sharable Id is the id where you can take it in My Banks Page. This is where that id should work

The amount field please fill it with float value. Ex: 5.00 100.00 500.00

The transfer will takes 2 days to complete, so it will show Processing in the Transaction History:<img width="726" height="311" alt="image" src="https://github.com/user-attachments/assets/daef7131-2934-46d0-bac3-e10951b9f9e8" />

Why it needs 2 days because my app use ACH network in the USA ^^

### Connect bank
In this function, you can add more bank to my app with the same way Plaid did


## Feedback
I would appreciate if you leave some feedback about my app in the link below, have fun ^^


https://docs.google.com/forms/d/e/1FAIpQLScNfqePKqLDC38yK81tdF6BCOvI5nqwmS-J_cGXbmZAmp1UAg/viewform?usp=header

