# FieldVerify Pro 11 feature parity

v11 is not considered ready to replace production until the field workflow below is restored and tested on iPad/iPhone/desktop.

## Restored / active now
- Separate app code and user data storage
- Project selection
- Work type selection: Caisson, ERS, Tieback, Waler, Footing, Column, Custom
- Lazy inspection index loading
- Lazy drawing metadata loading
- Lazy single-page PDF/image drawing loading
- Lightweight Pages list
- Caisson pins
- Multi-layer progress colors
- ERS: Pre-Drilled, Set, Final Drive
- Tieback: Drilled, Initial Grout, Regrouted, Tested, Locked Off
- Waler: Hung/Installed, Welded, Inspected
- Notes
- Start Work / Complete
- Explicit Save GPS
- Explicit Take Photo / Add Photos
- Photos remain unloaded until Load Photos is pressed
- Legacy records/drawings/photos read on demand

## Must restore before production cutover
- Full caisson inspection form/checklist fields
- Full ERS inspection workflow
- Full tieback inspection/testing workflow
- Waler range workflow and drawing interaction
- Drawing item overlays / tap-to-open inspection items for ERS, Tieback, Waler
- Drawing markup with finger / Apple Pencil
- Delete drawing/page
- Excel import workflows
- NCR/RFI list, import, status, attachments and engineer/fix information
- Poured/completion controls where applicable
- Project create/edit/delete management
- Backup Project: device + hosted choice
- Restore Project: device + hosted choice
- Full project PDF/report with photos
- Daily dashboard / shift report
- Office report/share workflow
- Cloud sign-in/project sharing/sync, loaded only when Cloud is opened
- Photo viewer and photo delete/management
- GPS map centering / location tools
- Export/recovery tools

## Release rule
Do not replace the production root app with v11 until this checklist is complete and field-tested. New features must use the v11 architecture directly; no stacked hotfix scripts or background whole-database scans.
