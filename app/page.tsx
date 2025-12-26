"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink, ArrowLeft } from "lucide-react"
import { fetchLatestNetflixLink } from "@/lib/api"

interface User {
  mobile: string
  validTill: string
  role: string
}

type ValidationStatus = "idle" | "checking" | "fetching" | "success" | "expired" | "not-found" | "error"

const AUTHORIZED_USERS: User[] = [{ mobile: "9772880079", validTill: "2029-12-12", role: "admin" }]

export default function NetflixHouseholdUpdater() {
  const [mobileNumber, setMobileNumber] = useState("")
  const [status, setStatus] = useState<ValidationStatus>("idle")
  const [validatedUser, setValidatedUser] = useState<User | null>(null)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [netflixLink, setNetflixLink] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isClient, setIsClient] = useState(false)

  // Ensure this only runs on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setMobileNumber(value)
  }

  const checkPermission = async () => {
    if (mobileNumber.length !== 10) return
    
    // Ensure we're on client side
    if (typeof window === 'undefined') {
      setErrorMessage("Please wait for the page to load completely")
      return
    }

    setStatus("checking")
    setErrorMessage("")

    // Check user authorization
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const user = AUTHORIZED_USERS.find((u) => u.mobile === mobileNumber)

    if (!user) {
      setStatus("not-found")
      return
    }

    const currentDate = new Date()
    const validTillDate = new Date(user.validTill)

    if (currentDate > validTillDate) {
      setValidatedUser(user)
      setStatus("expired")
      return
    }

    // User is valid, now fetch Netflix link from backend
    setValidatedUser(user)
    setStatus("fetching")

    try {
      // Call backend API to fetch latest Netflix verification link
      const response = await fetchLatestNetflixLink(30)

      if (response && response.success && response.link) {
        setNetflixLink(response.link)
        setStatus("success")
      } else if (response && !response.success) {
        // Backend returned an error response
        setErrorMessage(response.message || response.error || "Failed to fetch verification link")
        setStatus("error")
      } else {
        // Unexpected response format
        setErrorMessage("Invalid response from server")
        setStatus("error")
      }
    } catch (error) {
      console.error("Error fetching Netflix link:", error)
      
      // Provide user-friendly error messages
      let errorMsg = "Failed to connect to backend. Please ensure the backend server is running on port 5000."
      
      if (error instanceof Error) {
        errorMsg = error.message
      } else if (typeof error === 'string') {
        errorMsg = error
      }
      
      setErrorMessage(errorMsg)
      setStatus("error")
    }
  }

  const handleReset = () => {
    setMobileNumber("")
    setStatus("idle")
    setValidatedUser(null)
    setNetflixLink(null)
    setErrorMessage("")
  }

  const handleUpdateDevice = () => {
    // Open Netflix verification link in new tab
    const link = netflixLink || "https://netflix.com/verify-household"
    window.open(link, "_blank")
  }

  return (
    <div className="min-h-screen bg-netflix-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-netflix-dark via-netflix-darker to-black opacity-80" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-netflix-red opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-netflix-red opacity-5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">Tetra Digital Services</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-netflix-red mt-2 mb-3">Netflix Household Updater</h2>
          <p className="text-netflix-gray text-base md:text-lg">Verify your access and update your device</p>
        </div>

        {/* Main Card */}
        <Card className="bg-netflix-card border-netflix-border backdrop-blur-sm shadow-2xl p-6 md:p-8 rounded-xl">
          {status === "idle" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label htmlFor="mobile" className="text-sm font-medium text-netflix-light block">
                  Mobile Number
                </label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  className="bg-netflix-input border-netflix-border text-white placeholder:text-netflix-muted focus:ring-netflix-red focus:border-netflix-red h-12 text-base"
                  maxLength={10}
                />
                <p className="text-xs text-netflix-muted">{mobileNumber.length}/10 digits</p>
              </div>

              <Button
                onClick={checkPermission}
                disabled={mobileNumber.length !== 10}
                className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold h-12 text-base rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-netflix-red/50"
              >
                Check Permission
              </Button>
            </div>
          )}

          {status === "checking" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fade-in">
              <Loader2 className="w-12 h-12 text-netflix-red animate-spin" />
              <p className="text-netflix-light text-lg font-medium">Verifying your access...</p>
            </div>
          )}

          {status === "fetching" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-green-500 text-lg font-semibold">✓ Access Verified!</p>
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 text-netflix-red animate-spin" />
                <p className="text-netflix-light">Fetching latest update link...</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-2xl font-bold text-white">Access Verified!</h3>
                <p className="text-netflix-gray text-sm">Click below to verify your device with Netflix</p>
              </div>

              <Button
                onClick={handleUpdateDevice}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
                className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold h-14 text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-netflix-red/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Update My Device
                <ExternalLink
                  className={`w-5 h-5 transition-transform duration-200 ${isButtonHovered ? "translate-x-1 -translate-y-1" : ""}`}
                />
              </Button>

              <Button
                onClick={handleReset}
                variant="ghost"
                className="w-full text-netflix-gray hover:text-white hover:bg-netflix-input/50 h-11"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Check Another Number
              </Button>
            </div>
          )}

          {status === "expired" && validatedUser && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-bold text-white">⚠ Access Expired</h3>
                <p className="text-netflix-gray">
                  Your access has expired on{" "}
                  <span className="text-white font-semibold">
                    {new Date(validatedUser.validTill).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
              </div>

              <div className="bg-netflix-dark/50 border border-netflix-border rounded-lg p-4">
                <p className="text-netflix-light text-sm text-center">Please contact admin for renewal</p>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-netflix-border text-white hover:bg-netflix-input/50 h-11 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Check Another Number
              </Button>
            </div>
          )}

          {status === "not-found" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-bold text-white">✗ Mobile Number Not Found</h3>
                <p className="text-netflix-gray text-sm">Please check your number or contact admin</p>
              </div>

              <div className="bg-netflix-dark/50 border border-netflix-border rounded-lg p-4 space-y-2">
                <p className="text-netflix-light text-sm">
                  <strong className="text-white">Need help?</strong>
                </p>
                <p className="text-netflix-muted text-xs">
                  Contact your administrator to get access or verify your mobile number
                </p>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-netflix-border text-white hover:bg-netflix-input/50 h-11 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-bold text-white">⚠ Error Fetching Link</h3>
                <p className="text-netflix-gray text-sm">{errorMessage || "An error occurred while fetching the verification link"}</p>
              </div>

              <div className="bg-netflix-dark/50 border border-netflix-border rounded-lg p-4 space-y-2">
                <p className="text-netflix-light text-sm">
                  <strong className="text-white">Possible solutions:</strong>
                </p>
                <ul className="text-netflix-muted text-xs list-disc list-inside space-y-1">
                  <li>Ensure backend server is running on port 5000</li>
                  <li>Check that a Netflix verification email was received recently</li>
                  <li>Verify Gmail credentials in backend .env file</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={checkPermission}
                  className="flex-1 bg-netflix-red hover:bg-netflix-red-hover text-white h-11"
                >
                  Retry
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 border-netflix-border text-white hover:bg-netflix-input/50 h-11 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-netflix-muted text-xs">For authorized users only</p>
        </div>
      </div>
    </div>
  )
}
