# YaDNSb - Yet Another DNS Benchmark 🌐

[![Forks](https://img.shields.io/github/forks/altendorfme/yadnsb)](https://github.com/altendorfme/yadnsb/network/members) 
[![Stars](https://img.shields.io/github/stars/altendorfme/yadnsb)](https://github.com/altendorfme/yadnsb/stargazers) 
[![Issues](https://img.shields.io/github/issues/altendorfme/yadnsb)](https://github.com/altendorfme/yadnsb/issues)

Welcome to **YaDNSb**, a tool designed for testing DNS performance across various protocols including IPv4, IPv6, DNS over HTTPS (DoH), DNS over TLS (DoT), and DNS over QUIC (DoQ). This repository aims to provide a simple and effective way to benchmark DNS servers.

## 🚀 Public Instance

You can access the public instance of YaDNSb at the following link: [YaDNSb Public Instance](https://yadnsb.altendorfme.com). A special thanks to [Shiper.app](https://shiper.app/) for the free upgrade!

## 📦 Installation

### 1. Docker

To run YaDNSb using Docker, execute the following command in your terminal:

```bash
docker run -d \
  --name yadnsb \
  -p 3000:3000 \
  altendorfme/yadnsb
```

This command will pull the YaDNSb image and run it in a container named `yadnsb`. You can then access the application on your local machine at `http://localhost:3000`.

### 2. Manual Installation

If you prefer to install YaDNSb manually, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/altendorfme/yadnsb.git
   ```

2. **Navigate to the directory:**

   ```bash
   cd yadnsb
   ```

3. **Install dependencies:**

   Ensure you have Node.js installed. Then run:

   ```bash
   npm install
   ```

4. **Start the application:**

   ```bash
   npm start
   ```

The application will start on `http://localhost:3000`.

## 📊 Features

- **Multi-Protocol Support:** Test DNS performance for IPv4, IPv6, DoH, DoT, and DoQ.
- **User-Friendly Interface:** The application provides an intuitive interface for easy navigation.
- **Real-Time Results:** Get instant feedback on DNS performance metrics.
- **Custom Configurations:** Adjust settings to suit your benchmarking needs.

## 🛠 Usage

1. **Access the Application:** Open your web browser and go to `http://localhost:3000`.
2. **Select DNS Providers:** Choose the DNS providers you want to test from the dropdown menu.
3. **Run Benchmark:** Click the "Run Benchmark" button to start the testing process.
4. **View Results:** The application will display the results in real-time.

## 🔗 Releases

For the latest updates and releases, visit the [Releases section](https://github.com/red79buzz/yadnsb/releases). If you want to download a specific file, you can do so from there.

## 📄 Documentation

### Configuration Options

YaDNSb offers several configuration options to customize your benchmarking experience. Here are some of the key settings:

- **DNS Providers:** You can add or remove DNS providers as needed.
- **Timeout Settings:** Adjust the timeout settings for each request.
- **Protocol Selection:** Choose which protocols to include in your tests.

### Troubleshooting

If you encounter issues while using YaDNSb, consider the following steps:

1. **Check Dependencies:** Ensure that all required dependencies are installed.
2. **Review Logs:** Check the application logs for any error messages.
3. **Consult the Community:** If you still need help, feel free to open an issue on GitHub.

## 🧑‍🤝‍🧑 Community

We welcome contributions and feedback from the community. If you have suggestions or improvements, please open an issue or submit a pull request. Your input helps us make YaDNSb better for everyone.

### How to Contribute

1. **Fork the Repository:** Click the "Fork" button at the top right of this page.
2. **Clone Your Fork:** Use the following command:

   ```bash
   git clone https://github.com/YOUR_USERNAME/yadnsb.git
   ```

3. **Create a Branch:** Create a new branch for your changes:

   ```bash
   git checkout -b feature/YourFeature
   ```

4. **Make Changes:** Implement your changes and test them thoroughly.
5. **Commit Your Changes:** Use descriptive commit messages:

   ```bash
   git commit -m "Add feature: YourFeature"
   ```

6. **Push to Your Fork:** Push your changes to GitHub:

   ```bash
   git push origin feature/YourFeature
   ```

7. **Create a Pull Request:** Go to the original repository and click "New Pull Request."

## 📧 Contact

For any inquiries or support, please reach out via the GitHub issues page. We aim to respond promptly to all questions.

## 🎉 Acknowledgments

- Thanks to the contributors who have helped make YaDNSb a reality.
- Special thanks to [Shiper.app](https://shiper.app/) for their support.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🌍 Links

- [YaDNSb Public Instance](https://yadnsb.altendorfme.com)
- [Releases](https://github.com/red79buzz/yadnsb/releases)

Thank you for your interest in YaDNSb! We hope you find it useful for your DNS benchmarking needs.