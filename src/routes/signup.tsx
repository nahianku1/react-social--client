/* eslint-disable @typescript-eslint/no-unused-vars */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Save to localStorage
    const { confirmPassword, ...userInfo } = formData;
    localStorage.setItem("token", JSON.stringify(userInfo));

    setFormData({
      name: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    });
    navigate({ to: "/signin" });
    alert("Signup successful!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-white text-2xl sm:text-3xl font-semibold">
            Create Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-white">
                Mobile
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="1234567890"
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-purple-600 hover:bg-gray-100 transition-all font-semibold text-base sm:text-lg"
            >
              Sign Up
            </Button>
          </form>

          <div className="text-sm text-white text-center">
            Already have an account?{" "}
            <Link to="/signin" className="underline hover:text-gray-200">
              Signin
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
