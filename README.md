# Qisty - Installment Management System

Qisty is a modern, offline-first mobile application designed for small businesses and individuals to manage installment-based sales with ease, transparency, and professional accuracy. Built with React Native and Expo, it provides a seamless experience for tracking customers, items, payments, and profits.

## 📱 Screenshots

| Home Screen | Customers Tab | Items Tab |
|:---:|:---:|:---:|
| ![Home Screen](App%20Screenshots/Home%20Screen.jpg) | ![Customers Tab](App%20Screenshots/Customers%20Tab.jpg) | ![Items Tab](App%20Screenshots/Items%20Tab.jpg) |

| Installments Tab | Receipt | Customer Details |
|:---:|:---:|:---:|
| ![Installments Tab](App%20Screenshots/Installments%20Tab.jpg) | ![Receipt](App%20Screenshots/Recipt.jpg) | ![Customer Details](App%20Screenshots/Customer%20Details%20Model.jpg) |

| Item Details | Installment Details | Installment Details (Alt) |
|:---:|:---:|:---:|
| ![Item Details](App%20Screenshots/Item%20Details%20Model.jpg) | ![Installment Details](App%20Screenshots/Installment%20Details%20Model.jpg) | ![Installment Details 2](App%20Screenshots/Installment%20Details%20Model%202.jpg) |

## 🚀 Features

### 🛠 Smart Onboarding
*   **Step-by-Step Setup**: Guided wizard for first-time users to set their language, business name, currency, and create their first record.
*   **Skip Option**: Quick entry for experienced users.

### 💰 Financial Tracking & Analytics
*   **Profit Calculation**: Automatic profit tracking for every collection based on item cost and profit margin.
*   **Flexible Filters**: View your earnings daily, weekly, monthly, or yearly.
*   **Pagination**: Optimized performance for thousands of records using smart loading.
*   **Base Amount Recovery**: Transparent breakdown of cost recovery vs. actual profit.

### 📄 Professional Receipts
*   **Custom Branding**: Set your own business name in Settings to appear on all receipts.
*   **Image Generation**: Generate clean, professional PNG receipts for any payment.
*   **Easy Sharing**: Direct sharing to WhatsApp or other platforms.

### 👥 Customer & Item Management
*   **Customer Profiles**: Store contact info and link them to multiple installment plans.
*   **Item Catalog**: Manage your inventory with base prices and profit percentages.
*   **Installment History**: Complete audit trail of every payment made by a customer.

### 🌍 Localization & UI
*   **Full Urdu Support**: Fully translated interface with RTL (Right-to-Left) layout support.
*   **Dynamic Currency**: Use any currency symbol (PKR, $, €, etc.) globally across the app.
*   **Dark Mode**: Comfortable viewing in all lighting conditions.

### 🔒 Privacy & Security
*   **Offline First**: All data is stored locally on your device using SQLite. No cloud tracking.
*   **Local Backups**: Export and Import your database directly to your device storage via Android Storage Access Framework.

## 🛠 Tech Stack

*   **Framework**: [React Native](https://reactnative.dev/) (via [Expo](https://expo.dev/))
*   **UI Library**: [React Native Paper](https://reactnativepaper.com/) (Material Design)
*   **Database**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
*   **Localization**: [i18next](https://www.i18next.com/)
*   **Navigation**: [React Navigation](https://reactnavigation.org/)
*   **Persistence**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

## 🏁 Getting Started

### Prerequisites
*   Node.js (LTS)
*   npm or yarn
*   Expo CLI (`npm install -g expo-cli`)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/qisty.git
    cd qisty
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npx expo start
    ```

### Building for Production
To build a release APK locally using Gradle:
```bash
cd android
./gradlew assembleRelease
```
The APK will be generated at `android/app/build/outputs/apk/release/app-release.apk`.

## 🤝 Contributing

Contributions are welcome! Whether it's reporting a bug, suggesting a feature, or submitting a Pull Request, please feel free to contribute to the project's growth.

## 📜 Credits

*   **Ideated by**: [Asad Imran Shah](https://asadimran.pages.dev)
*   **Developed with**: Gemini CLI

---
**Qisty** - *Installment management made simple.*
