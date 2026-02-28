"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type OccupantType = "ADULT" | "CHILD_PRIMARY" | "CHILD_PRESCHOOL";
type BedType = "CWB" | "CWOB" | "NOT_APPLICABLE";

interface OccupantInput {
  _key: string; // local React key only — stripped before API call
  fullName: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  occupantType: OccupantType;
  isStudent: boolean;
  bedType: BedType;
}

interface ContactState {
  roomInChargeName: string;
  roomInChargeEmail: string;
  roomInChargeMobile: string;
  roomInChargeChurch: string;
  pdpaConsent: boolean;
}

export interface PricingData {
  singleAdultRate: number;
  twinAdultRate: number;
  tripleAdultRate: number;
  singleStudentRate: number;
  twinStudentRate: number;
  tripleStudentRate: number;
  childPrimaryRate: number;
  extraBedRate: number;
  preschoolRate: number;
}

interface Props {
  campEventId: string;
  pricing: PricingData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _keySeq = 0;
function newOccupant(type: OccupantType = "ADULT"): OccupantInput {
  return {
    _key: `occ_${++_keySeq}`,
    fullName: "",
    nationality: "",
    passportNumber: "",
    passportExpiry: "",
    occupantType: type,
    isStudent: false,
    bedType: type === "ADULT" ? "NOT_APPLICABLE" : "CWOB",
  };
}

function getPackageType(
  occupants: OccupantInput[]
): "SINGLE" | "TWIN" | "TRIPLE" | null {
  const count = occupants.filter((o) => o.occupantType === "ADULT").length;
  if (count === 0) return null;
  if (count === 1) return "SINGLE";
  if (count === 2) return "TWIN";
  return "TRIPLE";
}

function getLineRate(
  o: OccupantInput,
  pkg: "SINGLE" | "TWIN" | "TRIPLE",
  pricing: PricingData
): number {
  if (o.occupantType === "ADULT") {
    if (o.isStudent) {
      return pkg === "SINGLE"
        ? pricing.singleStudentRate
        : pkg === "TWIN"
          ? pricing.twinStudentRate
          : pricing.tripleStudentRate;
    }
    return pkg === "SINGLE"
      ? pricing.singleAdultRate
      : pkg === "TWIN"
        ? pricing.twinAdultRate
        : pricing.tripleAdultRate;
  }
  if (o.occupantType === "CHILD_PRIMARY") return pricing.childPrimaryRate;
  return 0; // CHILD_PRESCHOOL
}

function calcTotal(
  occupants: OccupantInput[],
  pricing: PricingData | null
): number {
  if (!pricing) return 0;
  const pkg = getPackageType(occupants);
  if (!pkg) return 0;
  let total = 0;
  for (const o of occupants) {
    total += getLineRate(o, pkg, pricing);
    if (o.bedType === "CWB") total += pricing.extraBedRate;
  }
  return total;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: string[];
}) {
  return (
    <nav className="flex items-center mb-8" aria-label="Progress">
      {steps.map((label, idx) => {
        const num = idx + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done || active
                    ? "text-white"
                    : "text-gray-400 border-2 border-gray-300 bg-white"
                }`}
                style={done || active ? { backgroundColor: "var(--color-primary)" } : {}}
              >
                {done ? "✓" : num}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  active ? "text-gray-900" : done ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 transition-colors ${done ? "" : "bg-gray-200"}`}
                style={done ? { backgroundColor: "var(--color-primary)" } : {}}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Step 1: Contact Details ──────────────────────────────────────────────────

type ContactErrors = Partial<Record<keyof ContactState, string>>;

function StepContact({
  data,
  onChange,
  onNext,
}: {
  data: ContactState;
  onChange: (patch: Partial<ContactState>) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<ContactErrors>({});

  function validate(): ContactErrors {
    const e: ContactErrors = {};
    if (!data.roomInChargeName.trim()) e.roomInChargeName = "Name is required.";
    if (!data.roomInChargeEmail.trim()) {
      e.roomInChargeEmail = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.roomInChargeEmail)) {
      e.roomInChargeEmail = "Enter a valid email address.";
    }
    if (!data.roomInChargeMobile.trim())
      e.roomInChargeMobile = "Mobile number is required.";
    if (!data.roomInChargeChurch.trim())
      e.roomInChargeChurch = "Church / ministry is required.";
    if (!data.pdpaConsent)
      e.pdpaConsent = "You must consent to data collection before proceeding.";
    return e;
  }

  function handleNext() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        Room In-Charge Details
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        These details will appear on the invoice. The invoice will be emailed to
        you after submission.
      </p>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="form-label">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="As per passport / NRIC"
            value={data.roomInChargeName}
            onChange={(e) => onChange({ roomInChargeName: e.target.value })}
          />
          {errors.roomInChargeName && (
            <p className="text-red-500 text-xs mt-1">{errors.roomInChargeName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="form-label">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className="form-input"
            placeholder="Invoice will be sent here"
            value={data.roomInChargeEmail}
            onChange={(e) => onChange({ roomInChargeEmail: e.target.value })}
          />
          {errors.roomInChargeEmail && (
            <p className="text-red-500 text-xs mt-1">{errors.roomInChargeEmail}</p>
          )}
        </div>

        {/* Mobile */}
        <div>
          <label className="form-label">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            className="form-input"
            placeholder="+65 9123 4567"
            value={data.roomInChargeMobile}
            onChange={(e) => onChange({ roomInChargeMobile: e.target.value })}
          />
          {errors.roomInChargeMobile && (
            <p className="text-red-500 text-xs mt-1">{errors.roomInChargeMobile}</p>
          )}
        </div>

        {/* Church */}
        <div>
          <label className="form-label">
            Church / Ministry <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. COSBT Main Congregation"
            value={data.roomInChargeChurch}
            onChange={(e) => onChange({ roomInChargeChurch: e.target.value })}
          />
          {errors.roomInChargeChurch && (
            <p className="text-red-500 text-xs mt-1">{errors.roomInChargeChurch}</p>
          )}
        </div>

        {/* PDPA */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            Personal Data Protection Notice (PDPA)
          </p>
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            The Church of Singapore (Bukit Timah) collects personal data
            (including names, contact details, and travel document numbers) for
            the purposes of hotel room reservation, camp administration, and
            related logistics. Your data will be kept secure and will not be
            disclosed to third parties except as necessary for camp operations.
          </p>
          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="mt-0.5 cursor-pointer"
              checked={data.pdpaConsent}
              onChange={(e) => onChange({ pdpaConsent: e.target.checked })}
            />
            <span className="text-sm text-gray-700">
              I consent to the collection and use of my personal data as
              described above.{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.pdpaConsent && (
            <p className="text-red-500 text-xs mt-2">{errors.pdpaConsent}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button onClick={handleNext} className="btn-primary">
          Continue to Occupants →
        </button>
      </div>
    </div>
  );
}

// ─── Occupant Card ────────────────────────────────────────────────────────────

function OccupantCard({
  occupant,
  index,
  canRemove,
  cwbAlreadyTaken,
  onChange,
  onRemove,
}: {
  occupant: OccupantInput;
  index: number;
  canRemove: boolean;
  cwbAlreadyTaken: boolean;
  onChange: (patch: Partial<OccupantInput>) => void;
  onRemove: () => void;
}) {
  const [showPassport, setShowPassport] = useState(false);
  const minExpiry = new Date().toISOString().split("T")[0];

  function handleTypeChange(newType: OccupantType) {
    const patch: Partial<OccupantInput> = { occupantType: newType };
    if (newType === "ADULT") {
      patch.isStudent = false;
      patch.bedType = "NOT_APPLICABLE";
    } else {
      patch.isStudent = false;
      // Keep existing bedType for children, but ensure it's not NOT_APPLICABLE
      if (occupant.bedType === "NOT_APPLICABLE") patch.bedType = "CWOB";
    }
    onChange(patch);
  }

  const typeLabel =
    occupant.occupantType === "ADULT"
      ? occupant.isStudent
        ? "Student"
        : "Adult"
      : occupant.occupantType === "CHILD_PRIMARY"
        ? "Child (Primary)"
        : "Child (Preschool)";

  return (
    <div className="card p-4 mb-4">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 text-sm">
          Occupant {index + 1}
          {occupant.fullName && (
            <span className="text-gray-400 font-normal ml-2">
              — {occupant.fullName}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {typeLabel}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-gray-300 hover:text-red-400 text-base leading-none transition-colors"
              title="Remove this occupant"
              aria-label="Remove occupant"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Occupant Type */}
        <div className="sm:col-span-2">
          <label className="form-label">
            Occupant Type <span className="text-red-500">*</span>
          </label>
          <select
            className="form-input"
            value={occupant.occupantType}
            onChange={(e) => handleTypeChange(e.target.value as OccupantType)}
          >
            <option value="ADULT">Adult</option>
            <option value="CHILD_PRIMARY">Child – Primary (ages 7–12)</option>
            <option value="CHILD_PRESCHOOL">Child – Preschool (ages 0–6) — Free</option>
          </select>
        </div>

        {/* Student toggle (adults only) */}
        {occupant.occupantType === "ADULT" && (
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={occupant.isStudent}
                onChange={(e) => onChange({ isStudent: e.target.checked })}
              />
              <span className="text-sm text-gray-700">
                This person is a student — student room rate applies
              </span>
            </label>
          </div>
        )}

        {/* Bed arrangement (children only) */}
        {occupant.occupantType !== "ADULT" && (
          <div className="sm:col-span-2">
            <label className="form-label">Bed Arrangement</label>
            <select
              className="form-input"
              value={occupant.bedType}
              onChange={(e) => onChange({ bedType: e.target.value as BedType })}
            >
              <option value="CWOB">Shares bed with parent / guardian (no charge)</option>
              <option
                value="CWB"
                disabled={cwbAlreadyTaken && occupant.bedType !== "CWB"}
              >
                Extra bed (CWB)
                {cwbAlreadyTaken && occupant.bedType !== "CWB"
                  ? " — only 1 extra bed allowed per room"
                  : ""}
              </option>
            </select>
            {occupant.bedType === "CWB" && (
              <p className="text-xs text-amber-700 mt-1">
                Extra bed surcharge will be added to the room total.
              </p>
            )}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="form-label">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="As per passport / NRIC"
            value={occupant.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
          />
        </div>

        {/* Nationality */}
        <div>
          <label className="form-label">
            Nationality <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Singaporean"
            value={occupant.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
          />
        </div>

        {/* Passport / NRIC */}
        <div>
          <label className="form-label">
            Passport / NRIC No. <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassport ? "text" : "password"}
              className="form-input pr-14"
              placeholder="Document number"
              value={occupant.passportNumber}
              onChange={(e) => onChange({ passportNumber: e.target.value })}
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowPassport((v) => !v)}
            >
              {showPassport ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Passport Expiry */}
        <div>
          <label className="form-label">
            Passport Expiry Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className="form-input"
            min={minExpiry}
            value={occupant.passportExpiry}
            onChange={(e) => onChange({ passportExpiry: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Price Estimate Panel ─────────────────────────────────────────────────────

function PricePanel({
  occupants,
  pricing,
}: {
  occupants: OccupantInput[];
  pricing: PricingData | null;
}) {
  const pkg = getPackageType(occupants);
  const total = calcTotal(occupants, pricing);

  return (
    <div className="card p-4 sticky top-4">
      <h4 className="font-semibold text-gray-700 text-sm mb-3">
        Price Estimate
      </h4>

      {!pkg ? (
        <p className="text-xs text-gray-400 italic">
          Add at least one adult to see the price estimate.
        </p>
      ) : (
        <>
          <div className="mb-3 pb-3 border-b">
            <p className="text-xs text-gray-500 mb-0.5">Room Package</p>
            <p className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>
              {pkg}
              <span className="text-gray-500 font-normal ml-1">
                ({occupants.filter((o) => o.occupantType === "ADULT").length}{" "}
                adult{occupants.filter((o) => o.occupantType === "ADULT").length !== 1 ? "s" : ""}
                /student{occupants.filter((o) => o.occupantType === "ADULT").length !== 1 ? "s" : ""})
              </span>
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            {occupants.map((o, i) => {
              const lineLabel =
                o.occupantType === "ADULT"
                  ? o.isStudent
                    ? `Student ${i + 1}`
                    : `Adult ${i + 1}`
                  : o.occupantType === "CHILD_PRIMARY"
                    ? `Child (Primary) ${i + 1}`
                    : `Child (Preschool) ${i + 1}`;
              const rate = pricing ? getLineRate(o, pkg, pricing) : 0;
              return (
                <div key={o._key} className="flex justify-between gap-2">
                  <span className="text-gray-600 truncate">
                    {o.fullName || lineLabel}
                    {o.occupantType === "CHILD_PRESCHOOL" && (
                      <span className="text-green-600 ml-1">(free)</span>
                    )}
                  </span>
                  <span className="shrink-0">S${rate.toFixed(2)}</span>
                </div>
              );
            })}

            {/* Extra bed lines */}
            {occupants
              .filter((o) => o.bedType === "CWB")
              .map((o) => (
                <div
                  key={`cwb_${o._key}`}
                  className="flex justify-between gap-2 text-amber-700"
                >
                  <span>Extra bed (CWB)</span>
                  <span>
                    S${pricing ? pricing.extraBedRate.toFixed(2) : "0.00"}
                  </span>
                </div>
              ))}
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
            <span>Est. Total</span>
            <span style={{ color: "var(--color-primary)" }}>
              S${total.toFixed(2)}
            </span>
          </div>

          {!pricing && (
            <p className="text-xs text-amber-600 mt-2">
              Pricing not yet configured — contact the church office.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Step 2: Occupants ────────────────────────────────────────────────────────

function StepOccupants({
  occupants,
  pricing,
  onChange,
  onBack,
  onNext,
}: {
  occupants: OccupantInput[];
  pricing: PricingData | null;
  onChange: (occupants: OccupantInput[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);

  const adultCount = occupants.filter((o) => o.occupantType === "ADULT").length;
  const cwbOccupantKey = occupants.find((o) => o.bedType === "CWB")?._key;

  function update(key: string, patch: Partial<OccupantInput>) {
    onChange(occupants.map((o) => (o._key === key ? { ...o, ...patch } : o)));
  }

  function add(type: OccupantType) {
    onChange([...occupants, newOccupant(type)]);
  }

  function remove(key: string) {
    onChange(occupants.filter((o) => o._key !== key));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (adultCount === 0) errs.push("At least one adult or student is required.");
    if (adultCount > 3) errs.push("A room can have at most 3 adults/students (TRIPLE).");
    occupants.forEach((o, i) => {
      const n = i + 1;
      if (!o.fullName.trim()) errs.push(`Occupant ${n}: Full name is required.`);
      if (!o.nationality.trim())
        errs.push(`Occupant ${n}: Nationality is required.`);
      if (!o.passportNumber.trim())
        errs.push(`Occupant ${n}: Passport / NRIC number is required.`);
      if (!o.passportExpiry)
        errs.push(`Occupant ${n}: Passport expiry date is required.`);
      else if (new Date(o.passportExpiry) <= new Date())
        errs.push(`Occupant ${n}: Passport expiry date must be in the future.`);
    });
    return errs;
  }

  function handleNext() {
    const errs = validate();
    setErrors(errs);
    if (errs.length === 0) onNext();
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: occupant cards + add buttons */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Room Occupants
          </h3>
          <p className="text-sm text-gray-500 mb-5">
            Add everyone sharing this room. The room package (Single / Twin /
            Triple) is determined by the number of adults and students.
          </p>

          {occupants.map((occ, idx) => (
            <OccupantCard
              key={occ._key}
              occupant={occ}
              index={idx}
              canRemove={occupants.length > 1}
              cwbAlreadyTaken={
                cwbOccupantKey !== undefined && cwbOccupantKey !== occ._key
              }
              onChange={(patch) => update(occ._key, patch)}
              onRemove={() => remove(occ._key)}
            />
          ))}

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => add("ADULT")}
              disabled={adultCount >= 3}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add Adult / Student
            </button>
            <button
              type="button"
              onClick={() => add("CHILD_PRIMARY")}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              + Add Child (Primary, 7–12)
            </button>
            <button
              type="button"
              onClick={() => add("CHILD_PRESCHOOL")}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              + Add Child (Preschool, free)
            </button>
          </div>

          {adultCount >= 3 && (
            <p className="text-xs text-amber-700 mt-2">
              Maximum of 3 adults/students reached (TRIPLE room). Children can
              still be added.
            </p>
          )}
        </div>

        {/* Right: price panel */}
        <div className="lg:w-60 shrink-0">
          <PricePanel occupants={occupants} pricing={pricing} />
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button onClick={handleNext} className="btn-primary">
          Review & Submit →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

function StepReview({
  contact,
  occupants,
  pricing,
  campEventId,
  onBack,
}: {
  contact: ContactState;
  occupants: OccupantInput[];
  pricing: PricingData | null;
  campEventId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const pkg = getPackageType(occupants);
  const total = calcTotal(occupants, pricing);

  async function handleSubmit() {
    setSubmitError("");
    setSubmitting(true);

    try {
      const payload = {
        campEventId,
        roomInChargeName: contact.roomInChargeName,
        roomInChargeEmail: contact.roomInChargeEmail,
        roomInChargeMobile: contact.roomInChargeMobile,
        roomInChargeChurch: contact.roomInChargeChurch,
        pdpaConsent: contact.pdpaConsent,
        // Strip local _key before sending
        // _key is a local React key only — strip it before sending to the API
        occupants: occupants.map(({ _key, ...rest }) => rest),
      };

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // Success — redirect to confirmation
      const params = new URLSearchParams({
        invoice: json.invoiceNumber,
        name: contact.roomInChargeName,
        email: contact.roomInChargeEmail,
        total: total.toFixed(2),
      });
      router.push(`/register/confirmation?${params.toString()}`);
    } catch {
      setSubmitError(
        "Network error. Please check your connection and try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-5">
        Review Your Booking
      </h3>

      {/* Contact summary */}
      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-sm text-gray-700">
            Room In-Charge
          </h4>
          <button
            type="button"
            onClick={onBack}
            className="text-xs underline"
            style={{ color: "var(--color-primary)" }}
          >
            Edit
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="font-medium">{contact.roomInChargeName}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="break-all">{contact.roomInChargeEmail}</dd>
          <dt className="text-gray-500">Mobile</dt>
          <dd>{contact.roomInChargeMobile}</dd>
          <dt className="text-gray-500">Church</dt>
          <dd>{contact.roomInChargeChurch}</dd>
        </dl>
      </div>

      {/* Room + occupants summary */}
      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-gray-700">
              Room Details
            </h4>
            {pkg && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {pkg}
              </span>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium text-gray-500">Name</th>
              <th className="pb-2 text-left font-medium text-gray-500">Type</th>
              <th className="pb-2 text-right font-medium text-gray-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {occupants.map((o, i) => {
              const typeLabel =
                o.occupantType === "ADULT"
                  ? o.isStudent
                    ? "Student"
                    : "Adult"
                  : o.occupantType === "CHILD_PRIMARY"
                    ? "Child (Primary, 7–12)"
                    : "Child (Preschool, 0–6)";
              const rate = pkg && pricing ? getLineRate(o, pkg, pricing) : 0;
              return (
                <tr key={o._key}>
                  <td className="py-2">
                    {o.fullName || `Occupant ${i + 1}`}
                  </td>
                  <td className="py-2 text-gray-500">{typeLabel}</td>
                  <td className="py-2 text-right">S${rate.toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Extra bed rows */}
            {occupants
              .filter((o) => o.bedType === "CWB")
              .map((o) => (
                <tr key={`cwb_${o._key}`}>
                  <td className="py-2 text-gray-400 italic" colSpan={2}>
                    Extra bed — {o.fullName || "child"}
                  </td>
                  <td className="py-2 text-right">
                    S${pricing ? pricing.extraBedRate.toFixed(2) : "0.00"}
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td colSpan={2} className="pt-3 font-bold">
                Total
              </td>
              <td
                className="pt-3 text-right font-bold text-base"
                style={{ color: "var(--color-primary)" }}
              >
                S${total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notice */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-5">
        <strong>Please review carefully before submitting.</strong> For changes
        after submission, contact the church office with your invoice number.
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          {submitError}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} disabled={submitting} className="btn-secondary">
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Confirm & Submit"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = ["Your Details", "Room Occupants", "Review & Submit"];

export default function RegistrationWizard({ campEventId, pricing }: Props) {
  const [step, setStep] = useState(1);
  const [contact, setContact] = useState<ContactState>({
    roomInChargeName: "",
    roomInChargeEmail: "",
    roomInChargeMobile: "",
    roomInChargeChurch: "",
    pdpaConsent: false,
  });
  const [occupants, setOccupants] = useState<OccupantInput[]>([
    newOccupant("ADULT"),
  ]);

  return (
    <div className="card p-6 sm:p-8">
      <StepIndicator current={step} steps={STEPS} />

      {step === 1 && (
        <StepContact
          data={contact}
          onChange={(patch) => setContact((c) => ({ ...c, ...patch }))}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepOccupants
          occupants={occupants}
          pricing={pricing}
          onChange={setOccupants}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepReview
          contact={contact}
          occupants={occupants}
          pricing={pricing}
          campEventId={campEventId}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
