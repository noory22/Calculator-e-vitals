"use client";

import { useState } from "react";

export default function Home() {
  // State for calculations
  const [patients, setPatients] = useState(200);
  const [rate, setRate] = useState(40);
  const [pm, setPm] = useState(102); // 102, 143, 73, or 'custom'
  const [setup, setSetup] = useState(22);
  const [customRate, setCustomRate] = useState(120);

  // Gating & Form Submission States
  const [name, setName] = useState("");
  const [practice, setPractice] = useState("");
  const [email, setEmail] = useState("");
  const [formErr, setFormErr] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGated, setIsGated] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  // Derived Calculations
  const enrolled = Math.round((patients * rate) / 100);
  const pmValue = pm === "custom" ? (parseFloat(customRate) || 0) : pm;
  const monthlyRevenue = enrolled * pmValue;
  const annualRevenue = monthlyRevenue * 12;
  const setupRevenue = enrolled * setup;
  const yearOneTotal = annualRevenue + setupRevenue;

  function formatNumber(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!name.trim() || !emailPattern.test(email.trim())) {
      setFormErr("Please enter your name and a valid email address.");
      setTimeout(() => {
        setFormErr("");
      }, 3000);
      return;
    }

    setFormErr("");
    setIsSending(true);

    try {
      // 1. Send data to Google Sheets API
      const saveLeadPromise = fetch("/api/save-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          practice: practice.trim(),
          email: email.trim(),
          patients,
          enrollmentRate: `${rate}%`,
          enrolled,
          standard: pm === "custom" ? `Custom ($${customRate}/mo)` : `$${pm}/mo`,
          annualRevenue: formatNumber(annualRevenue),
          setupRevenue: formatNumber(setupRevenue),
          yearOneTotal: formatNumber(yearOneTotal),
        }),
      }).then(async (res) => {
        const d = await res.json();
        if (!res.ok || !d.success) {
          console.warn("Google Sheets capture skipped/failed:", d.error || "Unknown error");
        }
        return d;
      }).catch((err) => {
        console.error("Google Sheets request failed:", err);
        return { success: false, error: err.message };
      });

      // 2. Send detailed estimate email
      const sendEstimatePromise = fetch("/api/send-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          practice: practice.trim(),
          patients,
          rate,
          billingScenario: pm === "custom" ? `Custom ($${customRate}/mo)` : `$${pm}/mo`,
          monthlyRevenue,
          enrolled,
          annualRevenue,
          setupRevenue,
          yearOneTotal,
        }),
      });

      const [, emailResponse] = await Promise.all([saveLeadPromise, sendEstimatePromise]);

      const data = await emailResponse.json();
      if (emailResponse.ok && data.success) {
        setIsSuccess(true);
        setIsGated(false);
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
      } else {
        setFormErr(data.error || "Failed to send estimate. Please try again.");
      }
    } catch (err) {
      setFormErr("An error occurred. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="wrap">
      {/* Header */}
      <div className="head">
        <svg viewBox="0 0 64 64">
          <path
            d="M32 55 C 12 41, 6 28, 12 19 C 17 11, 28 12, 32 21 C 36 12, 47 11, 52 19 C 58 28, 52 41, 32 55 Z"
            fill="none"
            stroke="#BE1E2D"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M16 34 H25 l3 -7 4 14 3 -9 2 4 h11"
            fill="none"
            stroke="#BE1E2D"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="46" r="3" fill="#BE1E2D" />
          <circle cx="22" cy="52" r="2.2" fill="#BE1E2D" />
        </svg>
        <div className="wm">
          e-Vitals<small>Remote Patient Monitoring</small>
        </div>
      </div>

      <div className="kicker">60-Second Estimate</div>
      <h1>
        How much could RPM add to <em>your practice?</em>
      </h1>
      <p className="sub">
        Estimate the recurring Medicare reimbursement your practice could generate by enrolling chronic-care patients
        in remote monitoring.
      </p>

      <div className="grid">
        {/* Inputs Panel */}
        <div className="panel">
          <h2>Your practice</h2>

          <div className="field">
            <label>
              Eligible chronic-care patients <span className="val" id="vPatients">{patients.toLocaleString("en-US")}</span>
            </label>
            <input
              type="range"
              id="patients"
              min="10"
              max="2000"
              step="10"
              value={patients}
              onChange={(e) => setPatients(parseInt(e.target.value))}
              aria-label="Number of eligible patients"
            />
          </div>

          <div className="field">
            <label>
              Expected enrollment rate <span className="val" id="vRate">{rate}%</span>
            </label>
            <input
              type="range"
              id="rate"
              min="5"
              max="100"
              step="5"
              value={rate}
              onChange={(e) => setRate(parseInt(e.target.value))}
              aria-label="Enrollment percentage"
            />
          </div>

          <label style={{ fontWeight: 700, fontSize: "14px", display: "block", marginBottom: "9px" }}>
            Billing scenario
          </label>
          <div className="scenarios" id="scn">
            <div
              className={`scn ${pm === 102 ? "active" : ""}`}
              onClick={() => {
                setPm(102);
                setSetup(22);
              }}
            >
              <span className="dot"></span>
              <div>
                <b>Standard</b>
                <span>99454 + 99457</span>
              </div>
              <div className="amt">
                $102<small style={{ fontSize: "11px", color: "var(--muted)" }}>/mo</small>
              </div>
            </div>

            <div
              className={`scn ${pm === 143 ? "active" : ""}`}
              onClick={() => {
                setPm(143);
                setSetup(22);
              }}
            >
              <span className="dot"></span>
              <div>
                <b>Active management</b>
                <span>99454 + 99457 + 99458</span>
              </div>
              <div className="amt">
                $143<small style={{ fontSize: "11px", color: "var(--muted)" }}>/mo</small>
              </div>
            </div>

            <div
              className={`scn ${pm === 73 ? "active" : ""}`}
              onClick={() => {
                setPm(73);
                setSetup(22);
              }}
            >
              <span className="dot"></span>
              <div>
                <b>Short-duration (2026)</b>
                <span>99445 + 99470</span>
              </div>
              <div className="amt">
                $73<small style={{ fontSize: "11px", color: "var(--muted)" }}>/mo</small>
              </div>
            </div>

            <div
              className={`scn ${pm === "custom" ? "active" : ""}`}
              onClick={() => {
                setPm("custom");
              }}
            >
              <span className="dot"></span>
              <div>
                <b>Custom rate</b>
                <span>Enter your contracted rate</span>
              </div>
              <div className="amt">$ —</div>
            </div>
          </div>

          {pm === "custom" && (
            <div className="custom show" id="customBox">
              <label>Average reimbursement per patient / month</label>
              <div className="in">
                <span>$</span>
                <input
                  type="number"
                  id="customRate"
                  min="0"
                  value={customRate}
                  step="5"
                  onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                  aria-label="Custom reimbursement rate"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="panel results">
          <h2>Estimated RPM revenue</h2>
          <div className="big">
            <div className="lab">Monthly recurring</div>
            <div className="num" id="monthly">
              {formatNumber(monthlyRevenue)}
              <small> /mo</small>
            </div>
          </div>

          <div className={`locked ${isGated ? "gated" : ""}`} id="locked">
            <div className="rows">
              <div className="row">
                <span>Patients enrolled</span>
                <b id="enrolled">{enrolled.toLocaleString("en-US")}</b>
              </div>
              <div className="row">
                <span>Annual recurring revenue</span>
                <b id="annual">{formatNumber(annualRevenue)}</b>
              </div>
              <div className="row">
                <span>One-time setup (99453)</span>
                <b id="setup">{formatNumber(setupRevenue)}</b>
              </div>
              <div className="row" style={{ borderTop: "1px solid rgba(255,255,255,.16)", paddingTop: "11px" }}>
                <span style={{ color: "#fff", fontWeight: 800 }}>Year-one total</span>
                <b id="yearone" style={{ color: "var(--gold)" }}>
                  {formatNumber(yearOneTotal)}
                </b>
              </div>
            </div>
            {isGated && (
              <div className="gate">
                <p>🔒 Enter your details below to unlock the full annual breakdown.</p>
              </div>
            )}
          </div>

          {/* Lead capture */}
          <div className="lead" id="lead">
            {!isSuccess ? (
              <div className="ff" id="form">
                <input
                  className="full"
                  id="fName"
                  placeholder="Your full name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  id="fPractice"
                  placeholder="Practice name"
                  autoComplete="organization"
                  value={practice}
                  onChange={(e) => setPractice(e.target.value)}
                />
                <input
                  id="fEmail"
                  type="email"
                  placeholder="Work email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {formErr && (
                  <div className="err" id="formErr" style={{ display: "block" }}>
                    {formErr}
                  </div>
                )}
                <button id="submit" onClick={handleSubmit} disabled={isSending}>
                  {isSending ? "Sending estimate..." : "Unlock my full estimate & book a demo →"}
                </button>
              </div>
            ) : (
              <div className="ok show" id="ok">
                <div className="check">✓</div>
                <b>Thanks — your full estimate is unlocked.</b>
                <p style={{ color: "#C9C2D6", fontSize: "13px", marginTop: "8px" }}>
                  A specialist will reach out to schedule your 15-minute demo. Check your inbox for the detailed
                  breakdown.
                </p>
                {previewUrl && (
                  <div style={{ marginTop: "16px" }}>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "10px 18px",
                        backgroundColor: "var(--gold)",
                        color: "var(--ink)",
                        borderRadius: "12px",
                        textDecoration: "none",
                        fontWeight: "800",
                        fontSize: "13px",
                        letterSpacing: ".02em",
                        transition: "transform 0.1s, opacity 0.2s",
                      }}
                    >
                      🔗 View Test Email (Ethereal Preview)
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="note">
        Estimates use 2026 Medicare national-average non-facility reimbursement rates and are for illustration only.
        Actual reimbursement varies by geographic locality, payer, patient eligibility, and documented time; figures
        reflect gross reimbursement before program and staffing costs. Not all patients qualify for RPM, and
        short-duration codes (99445/99470) cannot be billed in the same month as their full-length counterparts
        (99454/99457). This tool is informational and is not medical, billing, or legal advice — verify current CMS
        rates and requirements before relying on any figure. CPT is a registered trademark of the AMA.
      </p>
    </div>
  );
}
