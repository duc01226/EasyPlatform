# escaped-roots-project (test fixture)

Negative companion to `relocated-project/`. All eight relocatable roots declare a
`../escape…` value. Every accessor must REJECT the value and use its documented
default instead — proving the traversal guard is wired at all eight roots, not only
at the spec roots. Asserted by TC-DOCROOT-161.
