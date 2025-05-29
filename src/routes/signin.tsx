import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export const Route = createFileRoute("/signin")({
  component: RouteComponent,
});

function RouteComponent() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get users from localStorage
    const storedUsers = localStorage.getItem("token");
    const user = storedUsers ? JSON.parse(storedUsers) : {};

    if (
      user &&
      user.email === formData.email &&
      user.password === formData.password
    ) {
      setMessage("✅ Login successful!");
      localStorage.setItem("authenticated", "true");
      navigate({ to: "/" });
      // You can redirect or store session info here
    } else {
      setMessage("❌ Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen text-black flex items-center justify-center bg-custom-back px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-center  text-2xl sm:text-3xl font-semibold">
            Welcome Back
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="bg-white/90 focus:bg-white text-black placeholder:text-gray-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black  hover:bg-gray-100 transition-all font-semibold text-base sm:text-lg"
            >
              Sign In
            </Button>

            {message && <p className="text-sm  text-center">{message}</p>}

            <div className="text-sm  text-center">
              Forgot your password?{" "}
              <a href="#" className="underline hover:text-gray-200">
                Reset it
              </a>
            </div>
            <div className="text-sm  text-center">
              Don't have an account?{" "}
              <Link to="/signup" className="underline hover:text-gray-200">
                Click here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
