# Vercel Frontend Debug Plan

## Issue

- Production backend works perfectly (tested with Python script)
- Vercel frontend shows "Scan fail" when uploading
- Error happens in `handleFileSelect` → `previewDataset` call

## Investigation Steps

### 1. Check API_BASE Resolution on Vercel

**Question**: Is Vercel frontend actually calling the Railway backend?

**Test**: Add more detailed logging to `api-client.ts`

```typescript
console.log("[ACE NETWORK] 🚀 Connecting to Backend at:", API_BASE);
console.log("[ACE NETWORK] Window hostname:", window.location.hostname);
console.log("[ACE NETWORK] Is localhost?:", window.location.hostname === 'localhost');
```

### 2. Check uploadDataset Function

**File**: `src/lib/api-client.ts` line 87-101

**Current Code**:

```typescript
export async function uploadDataset(file: File): Promise<DatasetIdentity> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/runs/preview`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  return response.json();
}
```

**Potential Issues**:

- Missing CORS headers?
- Response not being parsed correctly?
- Network error not being caught?

### 3. Add Better Error Logging

**Change in `Index.tsx` line 94-101**:

```typescript
} catch (error) {
  console.error("[UPLOAD ERROR] Full error:", error);
  console.error("[UPLOAD ERROR] Error message:", error.message);
  console.error("[UPLOAD ERROR] Error stack:", error.stack);
  
  toast.error("Scan Failed", {
    description: error.message || "Could not analyze dataset structure. Please try again."
  });
  setStage("upload");
  setFile(null);
}
```

### 4. Check Network Tab

**User Action Needed**:

- Open Vercel deployment
- Open DevTools (F12)
- Go to Network tab
- Try uploading a file
- Check:
  - Is request to `/runs/preview` being made?
  - What's the request URL?
  - What's the response status?
  - What's the response body?

## Hypothesis

**Most Likely**: The `getBaseUrl()` function is returning the wrong URL on Vercel

**Why**:

- Vercel might be doing SSR (Server-Side Rendering)
- `window` might be undefined during initial render
- Function returns production URL for SSR, but then doesn't update

**Fix**: Force client-side only evaluation

```typescript
const getBaseUrl = () => {
  // ONLY run in browser
  if (typeof window === 'undefined') {
    return "https://ace-v4-production.up.railway.app"; // SSR fallback
  }
  
  const hostname = window.location.hostname;
  console.log("[ACE] Detected hostname:", hostname);
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log("[ACE] Using LOCAL backend");
    return "http://localhost:8000";
  }
  
  console.log("[ACE] Using PRODUCTION backend");
  return "https://ace-v4-production.up.railway.app";
};
```

## Next Steps

1. Add enhanced logging to api-client.ts
2. Deploy to Vercel
3. Check browser console for logs
4. Check Network tab for actual request
5. Report findings
