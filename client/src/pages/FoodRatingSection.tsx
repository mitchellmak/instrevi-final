        {/* Rate These Aspects (for Food) */}
        {reviewCategory === 'Food' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              Rate These Aspects (-5 to +5)
            </label>

            {/* Taste */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Taste
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: tasteRating < 0 ? '#c62828' : tasteRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {tasteRating > 0 ? `+${tasteRating}` : tasteRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={tasteRating}
                  onChange={(e) => setTasteRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Texture */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Texture
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: textureRating < 0 ? '#c62828' : textureRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {textureRating > 0 ? `+${textureRating}` : textureRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={textureRating}
                  onChange={(e) => setTextureRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Freshness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Freshness
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: freshnessRating < 0 ? '#c62828' : freshnessRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {freshnessRating > 0 ? `+${freshnessRating}` : freshnessRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={freshnessRating}
                  onChange={(e) => setFreshnessRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Presentation */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Presentation
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: presentationRating < 0 ? '#c62828' : presentationRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {presentationRating > 0 ? `+${presentationRating}` : presentationRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={presentationRating}
                  onChange={(e) => setPresentationRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Value for Money */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Value for Money
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: foodValueRating < 0 ? '#c62828' : foodValueRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {foodValueRating > 0 ? `+${foodValueRating}` : foodValueRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={foodValueRating}
                  onChange={(e) => setFoodValueRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Overall (Auto-calculated) */}
            <div style={{ 
              marginTop: '20px',
              padding: '16px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '8px',
              border: '2px solid #262626'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#262626' }}>
                Overall Rating (Auto-calculated)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  fontSize: '48px', 
                  fontWeight: '700', 
                  color: foodOverallRating < 0 ? '#c62828' : foodOverallRating === 0 ? '#757575' : '#2e7d32',
                  fontFamily: "'Poppins', sans-serif"
                }}>
                  {foodOverallRating > 0 ? `+${foodOverallRating}` : foodOverallRating}
                </span>
                <div style={{ fontSize: '14px', color: '#737373' }}>
                  out of 5
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '8px' }}>
                Average of Taste, Texture, Freshness, Presentation, and Value for Money
              </div>
            </div>
          </div>
        )}
