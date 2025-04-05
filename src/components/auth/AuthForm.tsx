
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

const AuthForm = () => {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      await login(loginEmail, loginPassword);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== registerConfirmPassword) {
      setPasswordsMatch(false);
      return;
    }
    
    setRegisterLoading(true);
    
    try {
      await register(registerUsername, registerEmail, registerPassword);
      navigate("/");
    } catch (error) {
      console.error("Register error:", error);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="ottoman-card shadow-lg">
        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="font-medium">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="font-medium">
              Register
            </TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                  Welcome Back
                </h3>
                <p className="text-ottoman-200 text-sm">
                  Log in to access your Ottoman banknote collection
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    className="ottoman-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-ottoman-200"
                    >
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-xs text-ottoman-400 hover:text-ottoman-300"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="ottoman-input pr-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="ottoman-button w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <span className="animate-pulse">Logging in...</span>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-ottoman-400">
                  Don't have an account?{" "}
                  <button
                    className="text-ottoman-300 hover:text-ottoman-100"
                    onClick={() => setActiveTab("register")}
                  >
                    Register
                  </button>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-serif font-semibold mb-2 text-gold-500">
                  Create Account
                </h3>
                <p className="text-ottoman-200 text-sm">
                  Join the Ottoman banknote collector community
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Username
                  </label>
                  <Input
                    id="username"
                    placeholder="YourUsername"
                    required
                    className="ottoman-input"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-email"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Email
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    className="ottoman-input"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-password"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="ottoman-input pr-10"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setPasswordsMatch(
                          e.target.value === registerConfirmPassword
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirm-password"
                    className="text-sm font-medium text-ottoman-200"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    className={`ottoman-input ${
                      !passwordsMatch && registerConfirmPassword
                        ? "border-red-500"
                        : ""
                    }`}
                    value={registerConfirmPassword}
                    onChange={(e) => {
                      setRegisterConfirmPassword(e.target.value);
                      setPasswordsMatch(registerPassword === e.target.value);
                    }}
                  />
                  {!passwordsMatch && registerConfirmPassword && (
                    <p className="text-xs text-red-500 mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="rounded text-ottoman-500 focus:ring-ottoman-500"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-ottoman-300"
                  >
                    I agree to the{" "}
                    <a href="#" className="text-ottoman-400 hover:text-ottoman-300">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-ottoman-400 hover:text-ottoman-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="ottoman-button w-full"
                  disabled={registerLoading || !passwordsMatch}
                >
                  {registerLoading ? (
                    <span className="animate-pulse">Creating account...</span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-ottoman-400">
                  Already have an account?{" "}
                  <button
                    className="text-ottoman-300 hover:text-ottoman-100"
                    onClick={() => setActiveTab("login")}
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthForm;
