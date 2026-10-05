"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Tv,
  Clock,
  KeyRound,
  ShieldCheck,
  Terminal,
} from "lucide-react"
import { fetchLatestNetflixLink } from "@/lib/api"

type PageStatus =
  | "idle"
  | "verifying"
  | "household_fetching"
  | "household_success"
  | "tv_input"
  | "tv_activating"
  | "tv_success"
  | "error"

interface CustomerQuota {
  currentCount: number
  maxCount: number
  nextAllowedDate?: string
  daysRemaining?: number
  service?: string
  expiryDate?: string
}

export default function NetflixHouseholdUpdater() {
  const [mobileNumber, setMobileNumber] = useState("")
  const [status, setStatus] = useState<PageStatus>("idle")
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [netflixLink, setNetflixLink] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [errorDetails, setErrorDetails] = useState<{
    reason?: string
    daysRemaining?: number
    nextAllowedDate?: string
  } | null>(null)
  const [isClient, setIsClient] = useState(false)

  // TV Activation state
  const [tvCode, setTvCode] = useState("")
  const [quota, setQuota] = useState<CustomerQuota | null>(null)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [activatedAccountName, setActivatedAccountName] = useState<string>("")
  const [showSelfLoginModal, setShowSelfLoginModal] = useState(false)

  // Load saved number on mount
  useEffect(() => {
    setIsClient(true)
    const savedNumber = localStorage.getItem("netflix_saved_mobile")
    if (savedNumber) {
      setMobileNumber(savedNumber)
    }
  }, [])

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setMobileNumber(value)
  }

  const handleTvCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
    setTvCode(value)
  }

  // 1. Check eligibility with server
  const verifyEligibility = async (action: "tv_login" | "household_update"): Promise<boolean> => {
    if (mobileNumber.length !== 10) return false

    if (typeof window !== "undefined") {
      localStorage.setItem("netflix_saved_mobile", mobileNumber)
    }

    setStatus("verifying")
    setErrorMessage("")
    setErrorDetails(null)

    try {
      const res = await fetch("/api/verify-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileNumber, action }),
      })

      const data = await res.json()

      if (!res.ok || !data.eligible) {
        setErrorMessage(data.message || "You are not eligible for this action at this time.")
        setErrorDetails({
          reason: data.reason,
          daysRemaining: data.daysRemaining,
          nextAllowedDate: data.nextAllowedDate,
        })
        setStatus("error")
        return false
      }

      setQuota({
        currentCount: data.currentCount,
        maxCount: data.maxCount,
        service: data.customer?.service,
        expiryDate: data.customer?.expiryDate,
      })

      return true
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify eligibility. Please try again.")
      setStatus("error")
      return false
    }
  }

  // Handle "Update your household" button
  const handleUpdateHousehold = async () => {
    const isEligible = await verifyEligibility("household_update")
    if (!isEligible) return

    setStatus("household_fetching")
    try {
      const response = await fetchLatestNetflixLink(30)

      if (response && response.success && response.link) {
        setNetflixLink(response.link)
        // Record update attempt
        try {
          await fetch("/api/record-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobile: mobileNumber }),
          })
          if (quota) {
            setQuota({ ...quota, currentCount: quota.currentCount + 1 })
          }
        } catch {
          // Non-fatal
        }
        setStatus("household_success")
      } else if (response && !response.success) {
        setErrorMessage(response.message || response.error || "Failed to fetch verification link")
        setStatus("error")
      } else {
        setErrorMessage("Invalid response from server")
        setStatus("error")
      }
    } catch (error: any) {
      console.error("Error fetching Netflix link:", error)
      let errorMsg =
        "Failed to connect to backend. Please ensure the verification email was received recently."
      if (error instanceof Error) {
        errorMsg = error.message
      }
      setErrorMessage(errorMsg)
      setStatus("error")
    }
  }

  // Handle "Login to your TV" button
  const handleLoginToTv = async () => {
    const isEligible = await verifyEligibility("tv_login")
    if (!isEligible) return
    setStatus("tv_input")
  }

  // Submit TV code activation
  const handleActivateTvCode = async () => {
    if (tvCode.length < 4) return

    setStatus("tv_activating")
    setTerminalLogs([
      "[SYSTEM] Connecting to Netflix TV activation service...",
      `[INFO] Validating mobile number +91 ${mobileNumber}...`,
    ])

    try {
      const res = await fetch("/api/activate-tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileNumber, code: tvCode }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "TV Activation failed")
        setErrorDetails({
          reason: data.reason,
          daysRemaining: data.daysRemaining,
          nextAllowedDate: data.nextAllowedDate,
        })
        setStatus("error")
        return
      }

      // Stream terminal logs
      const steps: string[] = data.steps || [
        "Allocating active Netflix streaming slot...",
        `Submitting TV activation code ${tvCode}...`,
        "Session verified! TV Device paired successfully.",
      ]

      for (const step of steps) {
        await new Promise((r) => setTimeout(r, 450))
        setTerminalLogs((prev) => [...prev, `[SUCCESS] ${step}`])
      }

      await new Promise((r) => setTimeout(r, 600))
      setActivatedAccountName(data.accountName || "Netflix Account")
      if (quota) {
        setQuota({ ...quota, currentCount: quota.currentCount + 1 })
      }
      setStatus("tv_success")
    } catch (err: any) {
      setErrorMessage(err.message || "Network error during TV activation")
      setStatus("error")
    }
  }

  const handleReset = () => {
    setStatus("idle")
    setNetflixLink(null)
    setErrorMessage("")
    setErrorDetails(null)
    setTvCode("")
    setTerminalLogs([])
    setShowSelfLoginModal(false)
  }

  const handleUpdateDevice = () => {
    const link = netflixLink || "https://netflix.com/verify-household"
    window.open(link, "_blank")
  }

  if (!isClient) return null

  return (
    <div className="min-h-screen bg-netflix-dark flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-netflix-dark via-netflix-darker to-black opacity-80 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-netflix-red opacity-5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-netflix-red opacity-5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">Tetra Digital Services</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-netflix-red mt-2 mb-3">Netflix Household Updater</h2>
          <p className="text-netflix-gray text-base md:text-lg">Verify your access and update your device</p>
        </div>

        {/* Main Card */}
        <Card className="bg-netflix-card border-netflix-border backdrop-blur-sm shadow-2xl p-6 md:p-8 rounded-xl">
          {/* STEP 1: IDLE - Phone number + 2 Buttons */}
          {status === "idle" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label htmlFor="mobile" className="text-sm font-medium text-netflix-light block">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-netflix-muted font-mono text-sm">
                    +91
                  </span>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={handleMobileChange}
                    className="bg-netflix-input border-netflix-border text-white placeholder:text-netflix-muted focus:ring-netflix-red focus:border-netflix-red h-12 text-base pl-12 font-mono"
                    maxLength={10}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-netflix-muted">
                  <span>{mobileNumber.length}/10 digits</span>
                  <span>1 attempt every 15 days • Max 2/month</span>
                </div>
              </div>

              {/* TWO BUTTONS as requested */}
              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleLoginToTv}
                  disabled={mobileNumber.length !== 10}
                  className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold h-13 text-base rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-netflix-red/50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Tv className="w-5 h-5" />
                  Login to your TV
                </Button>

                <Button
                  onClick={handleUpdateHousehold}
                  disabled={mobileNumber.length !== 10}
                  variant="outline"
                  className="w-full border-netflix-border text-white hover:bg-netflix-input/80 hover:text-white font-semibold h-12 text-base rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-netflix-input/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Update your household
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFYING ELIGIBILITY */}
          {status === "verifying" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fade-in">
              <Loader2 className="w-12 h-12 text-netflix-red animate-spin" />
              <p className="text-netflix-light text-lg font-medium">Checking subscription eligibility...</p>
              <p className="text-netflix-muted text-xs">Verifying subscription validity and device quota</p>
            </div>
          )}

          {/* STEP 3: FETCHING HOUSEHOLD LINK */}
          {status === "household_fetching" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fade-in">
              <Loader2 className="w-12 h-12 text-netflix-red animate-spin" />
              <p className="text-netflix-light text-lg font-medium">Fetching latest update link...</p>
              <p className="text-netflix-muted text-xs">Retrieving verification token from Netflix</p>
            </div>
          )}

          {/* STEP 4: HOUSEHOLD SUCCESS */}
          {status === "household_success" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-2xl font-bold text-white">Link Fetched!</h3>
                <p className="text-netflix-gray text-sm">Click below to verify your device with Netflix</p>
                {quota && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-dark/60 border border-netflix-border text-xs text-netflix-light">
                    <Clock className="w-3.5 h-3.5 text-netflix-red" />
                    <span>Attempt {quota.currentCount} of {quota.maxCount} used this month</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpdateDevice}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
                className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold h-14 text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-netflix-red/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                Update My Device
                <ExternalLink
                  className={`w-5 h-5 transition-transform duration-200 ${isButtonHovered ? "translate-x-1 -translate-y-1" : ""}`}
                />
              </Button>

              <Button
                onClick={handleReset}
                variant="ghost"
                className="w-full text-netflix-gray hover:text-white hover:bg-netflix-input/50 h-11 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Use Another Number
              </Button>
            </div>
          )}

          {/* STEP 5: TV CODE INPUT */}
          {status === "tv_input" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-netflix-red/10 rounded-full flex items-center justify-center mx-auto mb-2 text-netflix-red">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Login to Your TV</h3>
                <p className="text-netflix-gray text-xs">
                  Enter the code shown on your television screen (<span className="text-netflix-light font-mono">netflix.com/tv2</span>)
                </p>
              </div>

              {quota && (
                <div className="bg-netflix-dark/70 border border-netflix-border rounded-lg p-3 text-xs flex justify-between items-center text-netflix-light">
                  <span>Plan: <strong className="text-white">{quota.service || "Netflix"}</strong></span>
                  <span className="text-netflix-muted">
                    Quota: <strong className="text-netflix-light">{quota.currentCount}/{quota.maxCount} used</strong>
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="tvcode" className="text-xs font-medium text-netflix-light uppercase tracking-wider block">
                  TV Activation Code
                </label>
                <Input
                  id="tvcode"
                  type="text"
                  placeholder="e.g. 48291048"
                  value={tvCode}
                  onChange={handleTvCodeChange}
                  className="bg-netflix-input border-netflix-border text-white placeholder:text-netflix-muted focus:ring-netflix-red focus:border-netflix-red h-14 text-center font-mono text-2xl tracking-widest uppercase"
                  maxLength={8}
                  autoFocus
                />
                <p className="text-[11px] text-netflix-muted text-center">
                  Usually 4 to 8 letters or numbers shown on your TV
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleActivateTvCode}
                  disabled={tvCode.length < 4}
                  className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold h-13 text-base rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-netflix-red/50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Activate TV Now
                </Button>

                <Button
                  onClick={() => setShowSelfLoginModal(!showSelfLoginModal)}
                  variant="outline"
                  type="button"
                  className="w-full border-netflix-border text-netflix-gray hover:text-white hover:bg-netflix-input/50 h-10 text-xs bg-transparent cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {showSelfLoginModal ? "Hide Self Login Info" : "Or View Self Login Instructions"}
                </Button>
              </div>

              {showSelfLoginModal && (
                <div className="bg-netflix-dark/90 border border-netflix-border rounded-lg p-3.5 space-y-2 text-xs animate-fade-in">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-netflix-red" /> Self Login Option
                  </p>
                  <p className="text-netflix-gray leading-relaxed">
                    You can enter the code above to link your TV automatically through our cloud pool, or if you prefer manual login, contact admin for your dedicated profile PIN.
                  </p>
                </div>
              )}

              <Button
                onClick={handleReset}
                variant="ghost"
                className="w-full text-netflix-muted hover:text-white hover:bg-netflix-input/30 h-10 text-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </div>
          )}

          {/* STEP 6: TV ACTIVATING LIVE LOGS */}
          {status === "tv_activating" && (
            <div className="space-y-4 animate-fade-in py-2">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-netflix-red animate-spin" />
                <h3 className="text-lg font-bold text-white">Activating Netflix TV...</h3>
              </div>

              <div className="bg-black/90 border border-netflix-border/80 rounded-lg p-3.5 font-mono text-xs text-netflix-light space-y-2 max-h-48 overflow-y-auto">
                {terminalLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 leading-relaxed animate-fade-in">
                    <span className="text-netflix-red">❯</span>
                    <span className={log.includes("SUCCESS") ? "text-green-400" : log.includes("INFO") ? "text-blue-400" : "text-netflix-light"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-netflix-muted">Please keep this window open</p>
            </div>
          )}

          {/* STEP 7: TV SUCCESS */}
          {status === "tv_success" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-2xl font-bold text-white">TV Successfully Activated!</h3>
                <p className="text-netflix-gray text-sm">
                  Your television is now paired with {activatedAccountName || "Netflix"}. You can start streaming immediately.
                </p>
                {quota && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-dark/60 border border-netflix-border text-xs text-netflix-light">
                    <Clock className="w-3.5 h-3.5 text-netflix-red" />
                    <span>Attempt {quota.currentCount} of {quota.maxCount} used this month</span>
                  </div>
                )}
              </div>

              <div className="bg-netflix-dark/60 border border-netflix-border rounded-lg p-4 text-xs space-y-2">
                <p className="text-netflix-light font-semibold">Important Notes:</p>
                <ul className="text-netflix-muted space-y-1 list-disc list-inside">
                  <li>Your TV login will remain active on this television.</li>
                  <li>Do not log out of Netflix on your TV.</li>
                  <li>Next login attempt will be available after 15 days.</li>
                </ul>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-netflix-border text-white hover:bg-netflix-input/50 h-11 bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          )}

          {/* STEP 8: ERROR SCREEN */}
          {status === "error" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-bold text-white">
                  {errorDetails?.reason === "cooldown"
                    ? "Login Cooldown Active"
                    : errorDetails?.reason === "monthly_limit"
                      ? "Monthly Limit Reached"
                      : "Access Restricted"}
                </h3>
                <p className="text-netflix-gray text-sm leading-relaxed">
                  {errorMessage || "An error occurred while processing your request"}
                </p>
              </div>

              {/* Cooldown or Rate limit notice box */}
              {errorDetails?.daysRemaining && errorDetails.daysRemaining > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>Next attempt in {errorDetails.daysRemaining} days</span>
                  </div>
                  <p className="text-netflix-gray text-xs">
                    To prevent multiple device login, only 1 login attempt is permitted every 15 days (maximum 2 times a month).
                  </p>
                  {errorDetails.nextAllowedDate && (
                    <p className="text-white text-xs font-mono">
                      Available date: {errorDetails.nextAllowedDate}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-netflix-red hover:bg-netflix-red-hover text-white h-11 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Try Another Number
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
