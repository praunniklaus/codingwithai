import React from "react";

type ParsedData = {
  name?: string | null;
  occupation?: string | null;
  location?: string | null;
};

type Props = {
  onParsed: (data: ParsedData) => void;
};

export default function CvUpload({ onParsed }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showReview, setShowReview] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedData>({});
  const [edited, setEdited] = React.useState<ParsedData>({});

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/cv/parse", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const json = await res.json();
      const data = json.extracted || {};
      setParsed(data);
      setEdited(data);
      setShowReview(true);
    } catch (err: any) {
      setError(err?.message || "Failed to parse CV");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ParsedData, value: string) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    onParsed(edited);
    setShowReview(false);
    setParsed({});
    setEdited({});
  };

  const handleCancel = () => {
    setShowReview(false);
    setParsed({});
    setEdited({});
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Upload CV (PDF/DOCX/TXT)</label>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleChange}
        disabled={loading}
      />
      {loading && <p className="text-sm text-gray-500">Parsing CV…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Review Parsed CV Data</h2>
            <p className="mb-4 text-sm text-gray-600">
              Please review and edit the extracted information:
            </p>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={edited.name || ""}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Full name"
                />
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Occupation
                </label>
                <input
                  type="text"
                  value={edited.occupation || ""}
                  onChange={(e) =>
                    handleFieldChange("occupation", e.target.value)
                  }
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Software Engineer"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  value={edited.location || ""}
                  onChange={(e) => handleFieldChange("location", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Zurich, Switzerland"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Confirm & Use
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
