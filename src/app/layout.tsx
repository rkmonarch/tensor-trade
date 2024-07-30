import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tensor Blinks",
  description:
    "buy the lowest price NFTs of the collection directly through the Blinks & list your NFT on the tensor directly through the Blinks",
  openGraph: {
    images: "https://onlyblinks.com/og.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
