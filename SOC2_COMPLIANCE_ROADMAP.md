# SOC2 Compliance Roadmap - Raidu Inc

**Generated:** January 9, 2026
**Current Progress:** 12% (4/34 tasks completed)
**Organization:** Raidu Inc

---

## Progress Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Completed | 4 | 12% |
| In Progress | 1 | 3% |
| Pending | 29 | 85% |
| **Total** | **34** | **100%** |

**Each task = ~2.94% of total compliance**

---

## Table of Contents

1. [Completed Tasks](#completed-tasks)
2. [In Progress Tasks](#in-progress-tasks)
3. [Pending Tasks - High Priority](#pending-tasks---high-priority)
4. [Pending Tasks - Medium Priority](#pending-tasks---medium-priority)
5. [Integration Recommendations](#integration-recommendations)
6. [Progress Tracking Chart](#progress-tracking-chart)

---

## Completed Tasks

### 1. Code Changes ✅
**Progress Impact:** +2.94% | **Cumulative:** 2.94%

**What was done:**
- Enabled branch protection on main branch
- Enforced pull request reviews
- Regression testing is in place

**Evidence:** GitHub integration automatically validates this

---

### 2. Contact Information ✅
**Progress Impact:** +2.94% | **Cumulative:** 5.88%

**What was done:**
- Published clear instructions on how customers can contact about problems
- Issues and complaints are being logged

**Evidence:** Website contact page and support documentation

---

### 3. Legal Proof of Company Registration ✅
**Progress Impact:** +2.94% | **Cumulative:** 8.82%

**What was done:**
- Uploaded certificate of incorporation or government registry extract

**Evidence:** Official legal documentation uploaded

---

### 4. [Fourth Completed Task] ✅
**Progress Impact:** +2.94% | **Cumulative:** 11.76%

**Status:** Completed (visible in system)

---

## In Progress Tasks

### 5. 2FA (Two-Factor Authentication) 🔄
**Progress Impact:** +2.94% | **After Completion:** 14.70%

**SOC2 Requirement:** Access Control (CC6.1)

**What needs to be done:**
1. Enable 2FA/MFA on Google Workspace for all users
2. Enable 2FA on all critical applications:
   - GitHub ✓ (likely done via integration)
   - Jira
   - Slack
   - AWS Console
   - Any other business-critical apps
3. Document which apps have 2FA enabled
4. Upload screenshot showing 2FA enforcement settings

**Evidence Required:**
- Screenshot of Google Workspace Admin Console showing 2FA enforcement
- List of applications with 2FA status

**How to Complete:**
```
1. Go to Google Workspace Admin Console
2. Navigate to Security > Authentication > 2-Step Verification
3. Set enforcement to "On" for all users
4. Take screenshot
5. Upload to Evidence task
```

**Automation Available:** Google Workspace integration can auto-verify this

---

## Pending Tasks - High Priority

### 6. Access Review Log
**Progress Impact:** +2.94% | **After Completion:** 17.64%

**SOC2 Requirement:** Access Control (CC6.2, CC6.3)

**What needs to be done:**
1. Conduct quarterly access reviews for all key systems
2. Document the review process including:
   - Review dates
   - Reviewers/owners
   - Users/roles reviewed
   - Actions taken (removals/changes)
   - Issues found
   - Management sign-off

**Evidence Required:**
- Access review log spreadsheet or document
- Template available in the task

**How to Complete:**
```
1. List all systems with user access (GitHub, AWS, Google Workspace, Jira, etc.)
2. For each system, export user list
3. Review each user:
   - Is access still needed?
   - Is the role appropriate?
   - When was last login?
4. Remove/modify access as needed
5. Document all findings and actions
6. Get manager sign-off
7. Upload completed log
```

**Template Fields:**
| System | User | Role | Last Active | Action Taken | Reviewer | Date |
|--------|------|------|-------------|--------------|----------|------|
| GitHub | john@company.com | Admin | 2026-01-05 | No change | Manager | 2026-01-09 |

**Frequency:** Quarterly (every 3 months)

---

### 7. Backup Logs
**Progress Impact:** +2.94% | **After Completion:** 20.58%

**SOC2 Requirement:** Availability (A1.2)

**What needs to be done:**
1. Export backup job logs covering the last 10 consecutive days
2. Logs should show:
   - Timestamps
   - Success/failure status
   - Destinations
   - Retention settings
   - Any alerts/errors

**Evidence Required:**
- Exported logs or console screenshots from backup system
- Can be from: AWS Backup, Azure Backup, Google Cloud, Veeam, etc.

**How to Complete:**
```
AWS:
1. Go to AWS Backup Console
2. Navigate to Jobs > Backup jobs
3. Filter last 10 days
4. Export or screenshot the job list
5. Upload to Evidence task

Google Cloud:
1. Go to Cloud Console > Backup and DR
2. View backup job history
3. Screenshot showing successful backups
4. Upload to Evidence task
```

**What auditors look for:**
- Consistent daily backups
- High success rate (>99%)
- Proper retention (typically 30+ days)
- Multiple backup destinations (for critical data)

---

### 8. Backup Restoration Test
**Progress Impact:** +2.94% | **After Completion:** 23.52%

**SOC2 Requirement:** Availability (A1.2, A1.3)

**What needs to be done:**
1. Perform an actual restore test from backup
2. Document the process end-to-end
3. Verify data integrity after restore

**Evidence Required:**
- Screen recording of restore process, OR
- Completed restore test template with:
  - Test date
  - Backup source
  - Restore destination
  - Data verified
  - Time to restore
  - Issues encountered
  - Sign-off

**How to Complete:**
```
1. Select a non-production environment
2. Choose a recent backup (ideally from last 24-48 hours)
3. Initiate restore process
4. Record screen or take screenshots at each step:
   - Selecting backup
   - Restore in progress
   - Restore completed
   - Data verification (show restored data is intact)
5. Document total time taken
6. Note any issues
7. Upload evidence
```

**Frequency:** Annually (minimum), Quarterly (recommended)

---

### 9. Data Masking
**Progress Impact:** +2.94% | **After Completion:** 26.46%

**SOC2 Requirement:** Confidentiality (C1.1, C1.2)

**What needs to be done:**
1. Identify all sensitive data fields in your application
2. Implement masking for:
   - PII (names, emails, phone numbers) in logs
   - Credit card numbers
   - SSN/Tax IDs
   - Passwords (should never be visible)
   - API keys/tokens

**Evidence Required:**
- Documentation of data classification
- Screenshots showing masked data in:
  - Application logs
  - Database queries (if applicable)
  - Support tools
  - Analytics dashboards

**How to Complete:**
```
1. Audit application for sensitive data exposure:
   - Check logging configuration
   - Review error messages
   - Inspect analytics events

2. Implement masking:
   - Use logging libraries with PII filtering
   - Mask credit cards: **** **** **** 1234
   - Mask emails: j***@company.com
   - Never log passwords or tokens

3. Document:
   - What data is classified as sensitive
   - How each type is masked
   - Where masking is applied

4. Screenshot examples of masked data
5. Upload evidence
```

---

### 10. Device List
**Progress Impact:** +2.94% | **After Completion:** 29.40%

**SOC2 Requirement:** Asset Management (CC6.1)

**What needs to be done:**
1. Maintain an inventory of all company devices:
   - Laptops
   - Desktops
   - Mobile devices
   - Servers (if physical)

**Evidence Required:**
- Device inventory spreadsheet or MDM export
- Should include: Device type, Owner, Serial number, OS version, Last seen

**How to Complete:**
```
Option A - Manual:
1. Create spreadsheet with columns:
   | Device Name | Type | Owner | Serial # | OS | Last Updated |
2. Collect info from all employees
3. Update quarterly

Option B - Automated (Recommended):
1. Install Comp AI agent on devices
2. Devices auto-register in the system
3. Go to People > Employee Devices tab
4. Mark task as complete once devices appear

Option C - MDM Integration:
1. If using Jamf, Kandji, Intune, etc.
2. Export device list
3. Upload to Evidence task
```

**Automation Available:** Comp AI device agent auto-tracks this

---

### 11. Employee Access
**Progress Impact:** +2.94% | **After Completion:** 32.34%

**SOC2 Requirement:** Access Control (CC6.1, CC6.2)

**What needs to be done:**
1. Use an identity provider (IdP) for centralized access management
2. Document all users and their access levels
3. Review access annually

**Evidence Required:**
- Screenshot of identity provider showing user list
- Can be from: Google Workspace, Okta, Azure AD, etc.

**How to Complete:**
```
Google Workspace:
1. Go to Admin Console > Directory > Users
2. Take screenshot showing all users
3. Export user list if possible
4. Upload to Evidence task

Okta/Azure AD:
1. Navigate to Users section
2. Screenshot the user directory
3. Upload to Evidence task
```

**Automation Available:** Google Workspace integration auto-verifies this

---

### 12. Employee Verification
**Progress Impact:** +2.94% | **After Completion:** 35.28%

**SOC2 Requirement:** Human Resources (CC1.4)

**What needs to be done:**
1. Perform background/reference checks for all new hires
2. Maintain a log of verifications performed
3. Verify identity of every new employee

**Evidence Required:**
- Reference check log showing:
  - Employee name
  - Hire date
  - Verification type (background check, reference call, ID verification)
  - Verification date
  - Verified by
  - Result

**How to Complete:**
```
1. Create verification log spreadsheet:
   | Employee | Hire Date | Check Type | Date | Verified By | Result |

2. For each employee:
   - Conduct reference check (call previous employer)
   - Verify ID (passport, driver's license)
   - Background check (if required by role)

3. Document all verifications
4. Upload completed log
```

**Template:**
| Employee | Hire Date | Reference Check | ID Verified | Background Check | Verified By |
|----------|-----------|-----------------|-------------|------------------|-------------|
| John Doe | 2025-06-01 | Yes - 2 refs | Yes | N/A | HR Manager |

---

### 13. Encryption at Rest
**Progress Impact:** +2.94% | **After Completion:** 38.22%

**SOC2 Requirement:** Confidentiality (C1.1), Security (CC6.1)

**What needs to be done:**
1. Enable encryption on all data stores:
   - Databases (RDS, Cloud SQL, etc.)
   - Object storage (S3, GCS, Azure Blob)
   - Block storage (EBS, Persistent Disks)
   - Backups
2. Use KMS (Key Management Service) for key management
3. Enable key rotation

**Evidence Required:**
- Cloud console screenshots showing:
  - Database encryption enabled
  - Storage bucket encryption enabled
  - KMS key configuration
  - Key rotation settings

**How to Complete:**
```
AWS:
1. RDS > Databases > Select DB > Configuration
   - Screenshot showing "Encryption: Enabled"
2. S3 > Bucket > Properties > Default encryption
   - Screenshot showing SSE-S3 or SSE-KMS enabled
3. KMS > Customer managed keys
   - Screenshot showing key with rotation enabled

GCP:
1. Cloud SQL > Instance > Configuration
   - Screenshot showing encryption
2. Cloud Storage > Bucket > Configuration
   - Screenshot showing encryption type
3. Cloud KMS > Key rings
   - Screenshot of key configuration

Azure:
1. SQL Database > Transparent data encryption
2. Storage Account > Encryption
3. Key Vault > Keys
```

**What auditors look for:**
- AES-256 encryption (minimum)
- Customer-managed keys (preferred over provider-managed)
- Key rotation enabled (annual minimum)

---

### 14. Incident Response
**Progress Impact:** +2.94% | **After Completion:** 41.16%

**SOC2 Requirement:** Security Incident Management (CC7.4, CC7.5)

**What needs to be done:**
1. Maintain a log of all security incidents
2. Document how each incident was resolved
3. If no incidents, document that fact

**Evidence Required:**
- Incident log with:
  - Date/time of incident
  - Description
  - Severity
  - Response actions
  - Resolution
  - Lessons learned
- OR statement that no incidents occurred (with date range)

**How to Complete:**
```
If incidents occurred:
1. Create incident log:
   | ID | Date | Description | Severity | Response | Resolution | Owner |

2. For each incident document:
   - What happened
   - How it was detected
   - Who responded
   - What actions were taken
   - How it was resolved
   - What was learned

3. Upload completed log

If no incidents:
1. Create document stating:
   "No security incidents were reported or detected
   during the period [DATE] to [DATE]."
2. Sign and date
3. Upload to Evidence task
```

**Automation Available:** Jira integration can track incidents if configured

---

### 15. Incident Response Tabletop Exercise
**Progress Impact:** +2.94% | **After Completion:** 44.10%

**SOC2 Requirement:** Security Incident Management (CC7.4)

**What needs to be done:**
1. Conduct a simulated incident response exercise
2. Walk through a realistic scenario with your team
3. Document the exercise and findings

**Evidence Required:**
- Exercise documentation including:
  - Agenda/scenario
  - Attendee list and roles
  - Notes or recording
  - After-action report with:
    - What went well
    - What needs improvement
    - Action items with owners and due dates

**How to Complete:**
```
1. Schedule 1-2 hour meeting with key personnel:
   - Engineering lead
   - Security/IT
   - Management
   - Customer support (if customer-facing incident)

2. Choose a scenario:
   - Data breach discovered
   - Ransomware attack
   - DDoS attack
   - Insider threat
   - Vendor compromise

3. Walk through the scenario:
   - How would we detect this?
   - Who gets notified?
   - What's our communication plan?
   - How do we contain it?
   - How do we recover?
   - How do we report to customers/regulators?

4. Document everything:
   - Take notes during exercise
   - Record action items
   - Create after-action report

5. Upload:
   - Agenda
   - Attendee list
   - After-action report
```

**Frequency:** Annually (minimum)

---

### 16. Internal Security Audit
**Progress Impact:** +2.94% | **After Completion:** 47.04%

**SOC2 Requirement:** Monitoring (CC4.1, CC4.2)

**What needs to be done:**
1. Conduct an internal audit of information security controls
2. Document findings and remediation actions

**Evidence Required:**
- Audit documentation including:
  - Audit plan/scope
  - Auditor independence statement
  - Completed checklists/workpapers
  - Final report with findings
  - Risk ratings
  - Corrective action plans

**How to Complete:**
```
1. Define audit scope:
   - Access controls
   - Change management
   - Incident response
   - Data protection
   - Network security
   - Physical security

2. Create audit checklist:
   | Control | Expected | Actual | Finding | Risk |

3. Conduct audit:
   - Review documentation
   - Interview personnel
   - Test controls
   - Document evidence

4. Write report:
   - Executive summary
   - Scope and methodology
   - Findings (with severity)
   - Recommendations
   - Management response

5. Upload complete audit package
```

**Frequency:** Annually

**Note:** Can be performed by internal team if they're independent of the areas being audited, or hire external auditor.

---

### 17. Monitoring & Alerting
**Progress Impact:** +2.94% | **After Completion:** 49.98%

**SOC2 Requirement:** Monitoring (CC7.2, CC7.3)

**What needs to be done:**
1. Enable logging in all cloud environments
2. Set up alerts for security-relevant events
3. Review logs periodically

**Evidence Required:**
- Screenshots showing:
  - Logging enabled (CloudWatch, Cloud Logging, Azure Monitor)
  - Alert configurations
  - Sample alert notifications
- Log review schedule/process

**How to Complete:**
```
AWS:
1. CloudTrail > Trails
   - Screenshot showing trail is enabled
2. CloudWatch > Alarms
   - Screenshot of security-related alarms
3. GuardDuty (if enabled)
   - Screenshot of findings dashboard

GCP:
1. Cloud Logging > Logs Router
   - Screenshot showing logs are being collected
2. Cloud Monitoring > Alerting
   - Screenshot of alert policies
3. Security Command Center (if enabled)

Azure:
1. Azure Monitor > Activity Log
2. Microsoft Defender for Cloud
3. Alert rules configuration

Required Alerts (examples):
- Failed login attempts (>5 in 10 minutes)
- Root/admin account usage
- Security group changes
- IAM policy changes
- Unusual API activity
```

**Automation Available:** AWS/GCP/Azure integrations can auto-verify this

---

### 18. Role-based Access Controls (RBAC)
**Progress Impact:** +2.94% | **After Completion:** 52.92%

**SOC2 Requirement:** Access Control (CC6.1, CC6.3)

**What needs to be done:**
1. Define roles in your organization
2. Map permissions to each role
3. Assign users to roles (not individual permissions)

**Evidence Required:**
- RBAC matrix showing:
  - Roles defined
  - Permissions per role
  - Users assigned to each role
- OR template provided in the task

**How to Complete:**
```
1. Define roles:
   - Admin: Full access
   - Developer: Code repos, dev environments
   - Support: Customer data (read-only), support tools
   - Finance: Financial systems only
   - Read-only: View access only

2. Create RBAC matrix:
   | System | Admin | Developer | Support | Finance | Read-only |
   |--------|-------|-----------|---------|---------|-----------|
   | AWS    | Full  | Dev only  | None    | Billing | View logs |
   | GitHub | Admin | Write     | Read    | None    | Read      |
   | DB     | Full  | Dev DB    | Read    | None    | None      |

3. Document user-to-role assignments:
   | User | Role | Justification | Approved By |

4. Upload completed RBAC documentation
```

---

### 19. Secure Code
**Progress Impact:** +2.94% | **After Completion:** 55.86%

**SOC2 Requirement:** Change Management (CC8.1)

**What needs to be done:**
1. Enable automated vulnerability scanning for dependencies
2. Remediate high/critical vulnerabilities
3. Document scanning process

**Evidence Required:**
- Screenshot showing Dependabot or equivalent enabled
- Vulnerability report showing remediation status

**How to Complete:**
```
GitHub (Dependabot):
1. Go to Repository > Settings > Security
2. Enable Dependabot alerts
3. Enable Dependabot security updates
4. Screenshot the settings page
5. Go to Security > Dependabot alerts
6. Screenshot showing alert status
7. Upload evidence

Alternative tools:
- Snyk
- WhiteSource
- npm audit / yarn audit
- OWASP Dependency-Check

Required actions:
- Critical vulnerabilities: Fix within 7 days
- High vulnerabilities: Fix within 30 days
- Medium vulnerabilities: Fix within 90 days
```

**Automation Available:** GitHub integration checks this automatically

---

### 20. Secure Devices
**Progress Impact:** +2.94% | **After Completion:** 58.80%

**SOC2 Requirement:** Endpoint Security (CC6.1, CC6.7)

**What needs to be done:**
1. Enable disk encryption on all devices:
   - BitLocker (Windows)
   - FileVault (Mac)
2. Configure screen lock:
   - 5 minutes (Mac)
   - 15 minutes (Windows)
3. Enforce password requirements:
   - Minimum 8+ characters
4. Enable automatic security updates

**Evidence Required:**
- MDM dashboard showing compliance, OR
- Screenshots from individual devices showing:
  - Encryption enabled
  - Screen lock configured
  - Auto-updates enabled

**How to Complete:**
```
Mac (FileVault):
1. System Preferences > Security & Privacy > FileVault
2. Ensure FileVault is ON
3. Screenshot

Mac (Screen Lock):
1. System Preferences > Lock Screen
2. Set "Require password after sleep or screen saver" to 5 minutes
3. Screenshot

Windows (BitLocker):
1. Control Panel > BitLocker Drive Encryption
2. Ensure BitLocker is ON
3. Screenshot

Windows (Screen Lock):
1. Settings > Accounts > Sign-in options
2. Configure lock timeout
3. Screenshot

For company-wide:
1. Use MDM (Jamf, Kandji, Intune, etc.)
2. Push policies to all devices
3. Export compliance report
4. Upload to Evidence task
```

**Automation Available:** Comp AI device agent or MDM integration

---

### 21. Secure Secrets
**Progress Impact:** +2.94% | **After Completion:** 61.74%

**SOC2 Requirement:** Confidentiality (C1.1)

**What needs to be done:**
1. Use a secrets manager (not environment variables in code)
2. Never commit secrets to Git
3. Rotate secrets regularly

**Evidence Required:**
- Documentation showing:
  - Which secrets manager is used
  - Process for managing secrets
  - Git scanning enabled (to prevent secret commits)

**How to Complete:**
```
1. Choose a secrets manager:
   - AWS Secrets Manager
   - Google Secret Manager
   - Azure Key Vault
   - HashiCorp Vault
   - 1Password/LastPass Teams

2. Migrate secrets:
   - API keys
   - Database passwords
   - OAuth credentials
   - Encryption keys

3. Enable Git secret scanning:
   GitHub:
   - Settings > Security > Secret scanning
   - Enable secret scanning
   - Enable push protection

4. Document:
   - List of secret types managed
   - Rotation schedule
   - Access controls for secrets

5. Screenshot:
   - Secrets manager showing secrets (names only, not values)
   - GitHub secret scanning settings

6. Upload evidence
```

---

### 22. Separation of Environments
**Progress Impact:** +2.94% | **After Completion:** 64.68%

**SOC2 Requirement:** Change Management (CC8.1)

**What needs to be done:**
1. Maintain separate environments:
   - Development
   - Staging/Testing
   - Production
2. Restrict access between environments
3. Use separate credentials/accounts

**Evidence Required:**
- Cloud console screenshots showing:
  - Separate VPCs/accounts/projects for each environment
  - Different access controls per environment

**How to Complete:**
```
AWS:
1. Option A: Separate AWS accounts (recommended)
   - Screenshot of AWS Organizations showing:
     - Dev account
     - Staging account
     - Production account

2. Option B: Separate VPCs
   - VPC dashboard showing:
     - dev-vpc
     - staging-vpc
     - prod-vpc
   - Security groups restricting cross-VPC access

GCP:
1. Separate projects:
   - project-dev
   - project-staging
   - project-prod
2. Screenshot of Cloud Console project list

Azure:
1. Separate subscriptions or resource groups
2. Screenshot showing separation

Document:
- How code moves between environments
- Who has access to each environment
- How production is protected
```

---

## Pending Tasks - Medium Priority

### 23. App Availability
**Progress Impact:** +2.94% | **After Completion:** 67.62%

**SOC2 Requirement:** Availability (A1.1)

**What needs to be done:**
1. Ensure application can handle expected load
2. Have monitoring for availability
3. Document SLA/uptime targets

**Evidence Required:**
- Monitoring dashboard showing uptime
- Load test results (optional but recommended)
- Incident response for outages

**How to Complete:**
```
1. Set up uptime monitoring:
   - Pingdom
   - UptimeRobot
   - AWS CloudWatch Synthetics
   - Google Cloud Monitoring

2. Document:
   - Uptime target (e.g., 99.9%)
   - How outages are detected
   - Response process for outages

3. Optional - Load testing:
   - Use k6, JMeter, or Locust
   - Test expected peak load
   - Document results

4. Upload:
   - Uptime monitoring screenshot
   - SLA documentation
```

---

### 24. Board Meetings & Independence
**Progress Impact:** +2.94% | **After Completion:** 70.56%

**SOC2 Requirement:** Governance (CC1.2)

**What needs to be done:**
1. Hold regular board/management meetings covering security
2. Document meeting agendas and minutes
3. Show board member independence (for larger orgs)

**Evidence Required:**
- Recent meeting agenda and minutes covering security topics
- Board member CVs/LinkedIn showing independence (if applicable)

**How to Complete:**
```
1. Schedule quarterly security review meetings

2. Agenda should include:
   - Security incidents review
   - Compliance status update
   - Risk assessment review
   - Policy updates
   - Training status

3. Document minutes:
   - Attendees
   - Topics discussed
   - Decisions made
   - Action items

4. Upload:
   - Meeting agenda
   - Meeting minutes
   - Attendee list
```

---

### 25. Diagramming
**Progress Impact:** +2.94% | **After Completion:** 73.50%

**SOC2 Requirement:** Risk Assessment (CC3.1)

**What needs to be done:**
1. Create an architecture diagram showing:
   - System components
   - Data flows
   - Security boundaries
   - External integrations

**Evidence Required:**
- Single-page architecture diagram (PDF/image)

**How to Complete:**
```
Tools:
- Figma
- Draw.io (free)
- Lucidchart
- Miro

Include:
1. Client/User layer
2. Load balancer/CDN
3. Application servers
4. Database(s)
5. External services (payment, email, etc.)
6. Security boundaries (VPC, firewalls)
7. Data flow arrows

Tips:
- Keep it high-level (not every microservice)
- Show security controls (encryption, firewalls)
- Label environments (prod vs dev)
- Include legend

Upload completed diagram
```

---

### 26. Employee Descriptions
**Progress Impact:** +2.94% | **After Completion:** 76.44%

**SOC2 Requirement:** Human Resources (CC1.4)

**What needs to be done:**
1. Ensure every employee has a clear job description
2. Review job descriptions annually

**Evidence Required:**
- Job descriptions for all roles, OR
- HR system export showing roles are defined

**How to Complete:**
```
1. List all employees and their roles

2. For each role, document:
   - Title
   - Department
   - Reporting structure
   - Key responsibilities (5-10 bullet points)
   - Required qualifications
   - Security responsibilities

3. Have employees acknowledge their JD

4. Upload:
   - Job description documents, OR
   - HR system screenshot showing roles defined
```

---

### 27. Employee Performance Evaluations
**Progress Impact:** +2.94% | **After Completion:** 79.38%

**SOC2 Requirement:** Human Resources (CC1.4)

**What needs to be done:**
1. Conduct annual performance reviews for all employees
2. Include security awareness in evaluations

**Evidence Required:**
- Performance review schedule/calendar
- Sample review template (redacted)
- Completion tracking

**How to Complete:**
```
1. Set up annual review cycle:
   - Schedule reviews (e.g., anniversary date or fiscal year)
   - Create review template

2. Review template should include:
   - Goal achievement
   - Competency assessment
   - Security awareness rating
   - Development goals
   - Manager feedback

3. Track completion:
   | Employee | Review Date | Completed | Reviewer |

4. Upload:
   - Review schedule
   - Sample template (can be blank)
   - Completion tracking spreadsheet
```

---

### 28. Organisation Chart
**Progress Impact:** +2.94% | **After Completion:** 82.32%

**SOC2 Requirement:** Governance (CC1.2)

**What needs to be done:**
1. Create organizational chart showing reporting structure
2. Include all employees with full names and titles

**Evidence Required:**
- Org chart (PDF/image) showing hierarchy

**How to Complete:**
```
Tools:
- Lucidchart
- Draw.io
- Google Slides
- PowerPoint
- HR system export

Include:
- CEO/Founder at top
- Reporting lines
- All employees
- Full names
- Job titles
- Departments (color-coded)

Upload completed org chart
```

---

### 29. Planning (Disaster Recovery)
**Progress Impact:** +2.94% | **After Completion:** 85.26%

**SOC2 Requirement:** Availability (A1.2, A1.3)

**What needs to be done:**
1. Enable point-in-time recovery for databases
2. Document backup and recovery procedures
3. Test recovery annually

**Evidence Required:**
- Screenshot showing PITR enabled
- Backup/DR documentation

**How to Complete:**
```
AWS RDS:
1. Go to RDS > Databases > Select DB
2. Modify > Backup
3. Enable automated backups
4. Set retention period (7+ days recommended)
5. Screenshot configuration

GCP Cloud SQL:
1. Go to Cloud SQL > Instance
2. Edit > Backups
3. Enable automated backups
4. Enable point-in-time recovery
5. Screenshot configuration

Document:
- RPO (Recovery Point Objective): How much data can you lose?
- RTO (Recovery Time Objective): How long to recover?
- Recovery procedures

Upload screenshots and documentation
```

---

### 30. Public Policies
**Progress Impact:** +2.94% | **After Completion:** 88.20%

**SOC2 Requirement:** Privacy (P1.1)

**What needs to be done:**
1. Publish Privacy Policy on website
2. Publish Terms of Service on website
3. Include data deletion request process

**Evidence Required:**
- Links to Privacy Policy and Terms of Service
- Screenshot showing data deletion request form/process

**How to Complete:**
```
1. Ensure these pages exist on your website:
   - /privacy or /privacy-policy
   - /terms or /terms-of-service

2. Privacy Policy must include:
   - What data you collect
   - How you use data
   - How to request data deletion
   - Cookie policy
   - Third-party sharing
   - Contact information

3. Add comment with links:
   - Privacy Policy: https://yoursite.com/privacy
   - Terms of Service: https://yoursite.com/terms

4. Upload screenshot of data deletion process
```

---

### 31. Publish Policies (Employee Acknowledgment)
**Progress Impact:** +2.94% | **After Completion:** 91.14%

**SOC2 Requirement:** Governance (CC1.4)

**What needs to be done:**
1. Publish all internal policies in Comp AI
2. Have all employees review and sign/acknowledge policies
3. Track acknowledgment status

**Evidence Required:**
- Screenshot showing all policies published
- Employee acknowledgment report from portal.trycomp.ai

**How to Complete:**
```
1. Go to Policies page in Comp AI
   - Verify all 26 policies show "Published" status ✓

2. Send employees to portal.trycomp.ai:
   - Employees log in
   - Review each policy
   - Click "Acknowledge" or sign

3. Track completion:
   - Dashboard shows who has/hasn't signed
   - Follow up with anyone outstanding

4. Upload:
   - Screenshot of policies page showing all published
   - Acknowledgment report showing all employees signed
```

---

### 32. Statement of Applicability
**Progress Impact:** +2.94% | **After Completion:** 94.08%

**SOC2 Requirement:** ISO 27001 (if pursuing)

**What needs to be done:**
1. Document which ISO 27001 Annex A controls apply
2. Explain inclusion or exclusion of each control
3. Show implementation status

**Evidence Required:**
- Statement of Applicability document

**How to Complete:**
```
Note: This is primarily for ISO 27001 certification.
For SOC2-only, this may be optional.

1. Review ISO 27001 Annex A controls (114 controls)

2. For each control, document:
   - Control number and name
   - Applicable? (Yes/No)
   - Justification for exclusion (if No)
   - Implementation status (if Yes)
   - Evidence reference

3. Create SoA spreadsheet:
   | Control | Applicable | Justification | Status | Evidence |
   | A.5.1.1 | Yes | - | Implemented | Policy doc |
   | A.11.1.1 | No | No physical office | N/A | - |

4. Upload completed SoA
```

---

### 33. Utility Monitoring
**Progress Impact:** +2.94% | **After Completion:** 97.02%

**SOC2 Requirement:** Security (CC6.1)

**What needs to be done:**
1. Maintain a list of approved privileged utilities
2. Restrict access to these utilities
3. Monitor usage

**Evidence Required:**
- List of approved utilities with access controls

**How to Complete:**
```
1. Identify privileged utilities in use:
   - iptables/firewalld
   - tcpdump/wireshark
   - disk encryption tools
   - backup utilities
   - Database admin tools
   - Cloud CLI tools (aws, gcloud, az)

2. Document for each:
   | Utility | Purpose | Approved Users | Access Method |
   | aws cli | Cloud management | DevOps team | IAM roles |
   | psql | DB admin | DBA only | SSH + sudo |

3. Implement controls:
   - Restrict installation (MDM policy)
   - Require approval for access
   - Log usage

4. Upload approved utilities list
```

---

### 34. Additional Task (if any)
**Progress Impact:** +2.94% | **After Completion:** 100.00%

Check Evidence page for any additional tasks not listed above.

---

## Integration Recommendations

### High Priority - Automates Multiple Tasks

| Integration | Tasks Automated | Setup Effort |
|-------------|-----------------|--------------|
| **AWS** | Encryption at Rest, Monitoring & Alerting, Separation of Environments, Access Review | Medium |
| **Google Cloud Platform** | Same as AWS (if using GCP) | Medium |

### Medium Priority - Helpful Automation

| Integration | Tasks Automated | Setup Effort |
|-------------|-----------------|--------------|
| **Slack** | 2FA, Role-based Access Controls | Low |
| **Aikido Security** | Secure Code, Monitoring & Alerting | Low |
| **Vercel** | Monitoring & Alerting (if using Vercel) | Low |

### Optional - Identity Providers

If not using Google Workspace as primary IdP:
- Okta
- Azure AD
- Auth0
- OneLogin

---

## Progress Tracking Chart

Use this to track your progress:

```
Current:  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
Target:   ████████████████████████████████████████ 100%

Milestone Targets:
25% ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (9 tasks)
50% ████████████████████░░░░░░░░░░░░░░░░░░░░ (17 tasks)
75% ██████████████████████████████░░░░░░░░░░ (26 tasks)
100% ████████████████████████████████████████ (34 tasks)
```

### Quick Wins (Easy tasks to boost progress fast):

1. **Device List** - Install Comp AI agent or export from MDM
2. **Organisation Chart** - Quick to create in any tool
3. **Public Policies** - Just add links if policies exist
4. **Publish Policies** - Policies already at 100%, just need acknowledgments
5. **Incident Response** - If no incidents, just document that

### Tasks Requiring More Effort:

1. **Internal Security Audit** - Needs planning and execution
2. **Incident Response Tabletop** - Needs scheduling and facilitation
3. **Encryption at Rest** - May need infrastructure changes
4. **Separation of Environments** - May need architecture changes

---

## Next Steps

1. **Immediate (Today)**
   - Complete 2FA task (in progress)
   - Create Device List
   - Create Organisation Chart

2. **This Week**
   - Connect AWS/GCP integration
   - Upload Encryption at Rest evidence
   - Upload Backup Logs

3. **This Month**
   - Complete all High Priority tasks
   - Schedule Internal Security Audit
   - Schedule Incident Response Tabletop

4. **Ongoing**
   - Get all employees to acknowledge policies
   - Conduct quarterly access reviews
   - Maintain incident log

---

## Contact & Support

For questions about specific tasks, use the "Ask a question..." feature in Comp AI or contact support.

---

*This roadmap was generated based on your current compliance status. Update regularly as you complete tasks.*
