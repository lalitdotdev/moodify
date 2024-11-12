import "./globals.css";

import type { Metadata } from "next";
import { SonnerToaster } from "@/components/ui/sonner";
import localFont from "next/font/local";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "Moodify — AI-Powered Playlist Generator",
    description: "Moodify is a playlist generator that uses AI to create a personalized playlist based on your favorite song.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                {children}
                <SonnerToaster />
            </body>
        </html>
    );
}
