/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Add your network IPs to allowed dev origins
  allowedDevOrigins: [
    "10.0.0.101:3001",
    "10.0.0.101:3000",
    "192.168.1.100:3001",  // Add your actual network IP range
    "192.168.1.100:3000",    // Allow .local domains
    "localhost:3000",
    "localhost:3001"
  ],

};

export default nextConfig;
