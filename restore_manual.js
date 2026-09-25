const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AdminUpload.jsx', 'utf8');

const manualUploadBox = `
        {/* Upload Item Box */}
        <div className="bg-gray-800 p-6 rounded-lg border border-yellow-500">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">Manual Upload (Single Episode)</h2>
          <form onSubmit={handleUploadItem} className="flex flex-col gap-4">
            <select 
              value={selectedMediaId} onChange={e => setSelectedMediaId(e.target.value)}
              className="p-2 bg-gray-700 rounded"
            >
              <option value="">-- Select Course --</option>
              {mediaList.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            
            <input 
              type="text" placeholder="Episode Title (e.g. Lesson 1)" required
              className="p-2 bg-gray-700 rounded" value={itemTitle} onChange={e => setItemTitle(e.target.value)}
            />

            <select 
              value={itemType} onChange={e => setItemType(e.target.value)}
              className="p-2 bg-gray-700 rounded"
            >
              <option value="VIDEO">Video</option>
              <option value="TEXT">Text</option>
            </select>

            {itemType === 'VIDEO' ? (
              <>
                <div className="border border-dashed border-gray-600 p-4 rounded">
                  <label className="block mb-2 text-sm text-gray-400">Video File (MP4/MKV)</label>
                  <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
                </div>
                <div className="border border-dashed border-gray-600 p-4 rounded">
                  <label className="block mb-2 text-sm text-gray-400">Subtitle File (.srt / .vtt) - Optional</label>
                  <input type="file" accept=".srt,.vtt" onChange={e => setSubtitleFile(e.target.files[0])} />
                </div>
              </>
            ) : (
              <textarea 
                placeholder="Enter text lesson content..."
                className="p-2 bg-gray-700 rounded min-h-[150px]"
                value={textContent} onChange={e => setTextContent(e.target.value)}
              />
            )}

            <button type="submit" className="bg-yellow-600 p-2 rounded font-bold hover:bg-yellow-700">Upload Episode</button>
          </form>
        </div>
`;

code = code.replace('{/* Create Media Box */}', manualUploadBox + '\\n        {/* Create Media Box */}');

fs.writeFileSync('frontend/src/pages/AdminUpload.jsx', code);
