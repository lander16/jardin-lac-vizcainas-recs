# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src     :self
    policy.base_uri        :self
    policy.form_action     :self
    policy.frame_ancestors :none
    policy.object_src      :none
    policy.script_src      :self, "https://cdn.jsdelivr.net"
    policy.style_src       :self, :unsafe_inline, "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"
    policy.font_src        :self, :data, "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"
    policy.img_src         :self, :data
    policy.connect_src     :self, "https://cdn.jsdelivr.net"
  end

  # Generate per-request nonces because GET requests are stateless without a session cookie.
  # Keep style-src excluded so inline style attributes on progress bars remain permitted.
  config.content_security_policy_nonce_generator = ->(_request) { SecureRandom.base64(16) }
  config.content_security_policy_nonce_directives = %w[script-src]
  config.content_security_policy_nonce_auto = true
end
