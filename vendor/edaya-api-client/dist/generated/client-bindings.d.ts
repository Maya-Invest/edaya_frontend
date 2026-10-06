export declare const clientBindings: {
    readonly entities: {
        readonly schools: {
            readonly publicName: "schools";
            readonly schemaName: "School";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly academicYears: {
            readonly publicName: "academic-years";
            readonly schemaName: "AcademicYear";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly academicPeriods: {
            readonly publicName: "academic-periods";
            readonly schemaName: "AcademicPeriod";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly periodDefinitions: {
            readonly publicName: "period-definitions";
            readonly schemaName: "PeriodDefinition";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly gradeLevels: {
            readonly publicName: "grade-levels";
            readonly schemaName: "GradeLevel";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly staffMembers: {
            readonly publicName: "staff-members";
            readonly schemaName: "StaffMember";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly staffAssignments: {
            readonly publicName: "staff-assignments";
            readonly schemaName: "StaffAssignment";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly teachers: {
            readonly publicName: "teachers";
            readonly schemaName: "Teacher";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly teacherAssignments: {
            readonly publicName: "teacher-assignments";
            readonly schemaName: "TeacherAssignment";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly teacherUnavailabilities: {
            readonly publicName: "teacher-unavailabilities";
            readonly schemaName: "TeacherUnavailability";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly accountInvitations: {
            readonly publicName: "account-invitations";
            readonly schemaName: "AccountInvitation";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly staffPermissionAssignments: {
            readonly publicName: "staff-permission-assignments";
            readonly schemaName: "StaffPermissionAssignment";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly staffPermissionProfiles: {
            readonly publicName: "staff-permission-profiles";
            readonly schemaName: "StaffPermissionProfile";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: true;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: true;
            };
        };
        readonly staffPermissionProfileBindings: {
            readonly publicName: "staff-permission-profile-bindings";
            readonly schemaName: "StaffPermissionProfileBinding";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly staffManualPermissionAssignments: {
            readonly publicName: "staff-manual-permission-assignments";
            readonly schemaName: "StaffManualPermissionAssignment";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly staffPermissionScopeDefaults: {
            readonly publicName: "staff-permission-scope-defaults";
            readonly schemaName: "StaffPermissionScopeDefaults";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly attachments: {
            readonly publicName: "attachments";
            readonly schemaName: "Attachment";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly resources: {
            readonly publicName: "resources";
            readonly schemaName: "Resource";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly resourceAssignments: {
            readonly publicName: "resource-assignments";
            readonly schemaName: "ResourceAssignment";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly catalogServices: {
            readonly publicName: "catalog-services";
            readonly schemaName: "CatalogService";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly studentServiceEnrollments: {
            readonly publicName: "student-service-enrollments";
            readonly schemaName: "StudentServiceEnrollment";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly studentCharges: {
            readonly publicName: "student-charges";
            readonly schemaName: "StudentCharge";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly studentYearAccounts: {
            readonly publicName: "student-year-accounts";
            readonly schemaName: "StudentYearAccount";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly payments: {
            readonly publicName: "payments";
            readonly schemaName: "Payment";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly schedules: {
            readonly publicName: "schedules";
            readonly schemaName: "Schedule";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly lessonSessions: {
            readonly publicName: "lesson-sessions";
            readonly schemaName: "LessonSession";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly activitySessions: {
            readonly publicName: "activity-sessions";
            readonly schemaName: "ActivitySession";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly attendances: {
            readonly publicName: "attendances";
            readonly schemaName: "AttendanceOccurrence";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly calendarEvents: {
            readonly publicName: "calendar-events";
            readonly schemaName: "CalendarEvent";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly attendance: {
            readonly publicName: "attendance";
            readonly schemaName: "Attendance";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly announcements: {
            readonly publicName: "announcements";
            readonly schemaName: "Announcement";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly announcementTargets: {
            readonly publicName: "announcement-targets";
            readonly schemaName: "AnnouncementTarget";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly messageDeliveries: {
            readonly publicName: "message-deliveries";
            readonly schemaName: "MessageDelivery";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly schoolNotificationTemplates: {
            readonly publicName: "school-notification-templates";
            readonly schemaName: "SchoolNotificationTemplates";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly subjects: {
            readonly publicName: "subjects";
            readonly schemaName: "Subject";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly subjectCategories: {
            readonly publicName: "subject-categories";
            readonly schemaName: "SubjectCategory";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly subjectMatters: {
            readonly publicName: "subject-matters";
            readonly schemaName: "SubjectMatter";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly gradeLevelSubjects: {
            readonly publicName: "grade-level-subjects";
            readonly schemaName: "GradeLevelSubject";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly gradeLevelSubjectMatters: {
            readonly publicName: "grade-level-subject-matters";
            readonly schemaName: "GradeLevelSubjectMatter";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly classGroups: {
            readonly publicName: "class-groups";
            readonly schemaName: "ClassGroup";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly classSubjects: {
            readonly publicName: "class-subjects";
            readonly schemaName: "ClassSubject";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: true;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: true;
            };
        };
        readonly classSubjectMatters: {
            readonly publicName: "class-subject-matters";
            readonly schemaName: "ClassSubjectMatter";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly classSubjectProgress: {
            readonly publicName: "class-subject-progress";
            readonly schemaName: "ClassSubjectProgress";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly activities: {
            readonly publicName: "activities";
            readonly schemaName: "Activity";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly activityEnrollments: {
            readonly publicName: "activity-enrollments";
            readonly schemaName: "ActivityEnrollment";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly classActivityEnrollments: {
            readonly publicName: "class-activity-enrollments";
            readonly schemaName: "ClassActivityEnrollment";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly assessments: {
            readonly publicName: "assessments";
            readonly schemaName: "Assessment";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly assessmentResults: {
            readonly publicName: "assessment-results";
            readonly schemaName: "AssessmentResult";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly gradeScales: {
            readonly publicName: "grade-scales";
            readonly schemaName: "GradeScale";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly definitions: {
            readonly publicName: "definitions";
            readonly schemaName: "ReportCardDefinition";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly sections: {
            readonly publicName: "sections";
            readonly schemaName: "ReportCardDefinitionSection";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly results: {
            readonly publicName: "results";
            readonly schemaName: "ReportCardResult";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly students: {
            readonly publicName: "students";
            readonly schemaName: "Student";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly enrollments: {
            readonly publicName: "enrollments";
            readonly schemaName: "StudentClassEnrollment";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly guardians: {
            readonly publicName: "guardians";
            readonly schemaName: "Guardian";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly guardianLinks: {
            readonly publicName: "guardian-links";
            readonly schemaName: "GuardianStudentLink";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly studentNotes: {
            readonly publicName: "student-notes";
            readonly schemaName: "StudentNote";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly studentPhotoSubmissions: {
            readonly publicName: "student-photo-submissions";
            readonly schemaName: "StudentPhotoSubmission";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
        readonly studentHealthProfiles: {
            readonly publicName: "student-health-profiles";
            readonly schemaName: "StudentHealthProfile";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly studentDisciplinaryActions: {
            readonly publicName: "student-disciplinary-actions";
            readonly schemaName: "StudentDisciplinaryAction";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly disciplinaryActions: {
            readonly publicName: "disciplinary-actions";
            readonly schemaName: "DisciplinaryAction";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly studentIncidentInvolvements: {
            readonly publicName: "student-incident-involvements";
            readonly schemaName: "StudentIncidentInvolvement";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly incidents: {
            readonly publicName: "incidents";
            readonly schemaName: "Incident";
            readonly allowDirectSave: true;
            readonly publicOperations: {
                readonly create: true;
                readonly update: true;
                readonly delete: true;
                readonly batchCreate: true;
                readonly batchUpdate: true;
                readonly batchDelete: true;
            };
        };
        readonly documentIssuances: {
            readonly publicName: "document-issuances";
            readonly schemaName: "DocumentIssuance";
            readonly allowDirectSave: false;
            readonly publicOperations: {
                readonly create: false;
                readonly update: false;
                readonly delete: false;
                readonly batchCreate: false;
                readonly batchUpdate: false;
                readonly batchDelete: false;
            };
        };
    };
    readonly commands: {
        readonly registerSchool: {
            readonly publicName: "register-school";
            readonly requestSchemaName: "RegisterSchoolCommand";
            readonly responseSchemaName: "School";
        };
        readonly updateSchoolConfiguration: {
            readonly publicName: "update-school-configuration";
            readonly requestSchemaName: "UpdateSchoolConfigurationCommand";
            readonly responseSchemaName: "School";
        };
        readonly createAcademicYear: {
            readonly publicName: "create-academic-year";
            readonly requestSchemaName: "CreateAcademicYearCommand";
            readonly responseSchemaName: "AcademicYear";
        };
        readonly publishAcademicYear: {
            readonly publicName: "publish-academic-year";
            readonly requestSchemaName: "PublishAcademicYearCommand";
            readonly responseSchemaName: "AcademicYear";
        };
        readonly archiveAcademicYear: {
            readonly publicName: "archive-academic-year";
            readonly requestSchemaName: "ArchiveAcademicYearCommand";
            readonly responseSchemaName: "AcademicYear";
        };
        readonly createAcademicPeriod: {
            readonly publicName: "create-academic-period";
            readonly requestSchemaName: "CreateAcademicPeriodCommand";
            readonly responseSchemaName: "AcademicPeriod";
        };
        readonly publishAcademicPeriod: {
            readonly publicName: "publish-academic-period";
            readonly requestSchemaName: "PublishAcademicPeriodCommand";
            readonly responseSchemaName: "AcademicPeriod";
        };
        readonly configureGradeLevel: {
            readonly publicName: "configure-grade-level";
            readonly requestSchemaName: "GradeLevelConfigCommand";
            readonly responseSchemaName: "GradeLevel";
        };
        readonly configurePeriodDefinition: {
            readonly publicName: "configure-period-definition";
            readonly requestSchemaName: "PeriodDefinitionConfigCommand";
            readonly responseSchemaName: "PeriodDefinition";
        };
        readonly configureResource: {
            readonly publicName: "configure-resource";
            readonly requestSchemaName: "ResourceConfigCommand";
            readonly responseSchemaName: "Resource";
        };
        readonly configureActivity: {
            readonly publicName: "configure-activity";
            readonly requestSchemaName: "ActivityConfigCommand";
            readonly responseSchemaName: "Activity";
        };
        readonly enrollStudentInActivity: {
            readonly publicName: "enroll-student-in-activity";
            readonly requestSchemaName: "ActivityEnrollmentConfigCommand";
            readonly responseSchemaName: "ActivityEnrollment";
        };
        readonly createClassGroup: {
            readonly publicName: "create-class-group";
            readonly requestSchemaName: "CreateClassGroupCommand";
            readonly responseSchemaName: "ClassGroup";
        };
        readonly updateClassGroupConfiguration: {
            readonly publicName: "update-class-group-configuration";
            readonly requestSchemaName: "UpdateClassGroupConfigurationCommand";
            readonly responseSchemaName: "ClassGroup";
        };
        readonly registerStaffMember: {
            readonly publicName: "register-staff-member";
            readonly requestSchemaName: "RegisterStaffMemberCommand";
            readonly responseSchemaName: "StaffMember";
        };
        readonly registerTeacher: {
            readonly publicName: "register-teacher";
            readonly requestSchemaName: "RegisterTeacherCommand";
            readonly responseSchemaName: "Teacher";
        };
        readonly updateStaffMemberStatus: {
            readonly publicName: "update-staff-member-status";
            readonly requestSchemaName: "UpdateStaffMemberStatusCommand";
            readonly responseSchemaName: "StaffMember";
        };
        readonly updateStaffMemberProfile: {
            readonly publicName: "update-staff-member-profile";
            readonly requestSchemaName: "UpdateStaffMemberProfileCommand";
            readonly responseSchemaName: "StaffMember";
        };
        readonly updateTeacherSelfProfile: {
            readonly publicName: "update-teacher-self-profile";
            readonly requestSchemaName: "UpdateTeacherSelfProfileCommand";
            readonly responseSchemaName: "Teacher";
        };
        readonly linkActorSubject: {
            readonly publicName: "link-actor-subject";
            readonly requestSchemaName: "LinkActorSubjectCommand";
            readonly responseSchemaName: "LinkActorSubjectResponse";
        };
        readonly relinkActorSubject: {
            readonly publicName: "relink-actor-subject";
            readonly requestSchemaName: "RelinkActorSubjectCommand";
            readonly responseSchemaName: "RelinkActorSubjectResponse";
        };
        readonly unlinkActorSubject: {
            readonly publicName: "unlink-actor-subject";
            readonly requestSchemaName: "UnlinkActorSubjectCommand";
            readonly responseSchemaName: "UnlinkActorSubjectResponse";
        };
        readonly sendAccountInvitation: {
            readonly publicName: "send-account-invitation";
            readonly requestSchemaName: "SendAccountInvitationCommand";
            readonly responseSchemaName: "SendAccountInvitationResponse";
        };
        readonly resendAccountInvitation: {
            readonly publicName: "resend-account-invitation";
            readonly requestSchemaName: "ResendAccountInvitationCommand";
            readonly responseSchemaName: "ResendAccountInvitationResponse";
        };
        readonly revokeAccountInvitation: {
            readonly publicName: "revoke-account-invitation";
            readonly requestSchemaName: "RevokeAccountInvitationCommand";
            readonly responseSchemaName: "AccountInvitation";
        };
        readonly acceptAccountInvitation: {
            readonly publicName: "accept-account-invitation";
            readonly requestSchemaName: "AcceptAccountInvitationCommand";
            readonly responseSchemaName: "AcceptAccountInvitationResponse";
        };
        readonly assignStaffToClass: {
            readonly publicName: "assign-staff-to-class";
            readonly requestSchemaName: "AssignStaffToClassCommand";
            readonly responseSchemaName: "StaffAssignment";
        };
        readonly assignStaffToClassSubject: {
            readonly publicName: "assign-staff-to-class-subject";
            readonly requestSchemaName: "AssignStaffToClassSubjectCommand";
            readonly responseSchemaName: "StaffAssignment";
        };
        readonly assignStaffToLessonSession: {
            readonly publicName: "assign-staff-to-lesson-session";
            readonly requestSchemaName: "AssignStaffToLessonSessionCommand";
            readonly responseSchemaName: "StaffAssignment";
        };
        readonly configureStaffPermissionScopeDefaults: {
            readonly publicName: "configure-staff-permission-scope-defaults";
            readonly requestSchemaName: "ConfigureStaffPermissionScopeDefaultsCommand";
            readonly responseSchemaName: "ConfigureStaffPermissionScopeDefaultsResponse";
        };
        readonly removeStaffPermission: {
            readonly publicName: "remove-staff-permission";
            readonly requestSchemaName: "RemoveStaffPermissionCommand";
            readonly responseSchemaName: "RemoveStaffPermissionResponse";
        };
        readonly assignStaffPermission: {
            readonly publicName: "assign-staff-permission";
            readonly requestSchemaName: "StaffPermissionAssignmentConfigCommand";
            readonly responseSchemaName: "AssignStaffPermissionResponse";
        };
        readonly configurePermissionProfile: {
            readonly publicName: "configure-permission-profile";
            readonly requestSchemaName: "ConfigurePermissionProfileCommand";
            readonly responseSchemaName: "ConfigurePermissionProfileResponse";
        };
        readonly applyStaffPermissionProfile: {
            readonly publicName: "apply-staff-permission-profile";
            readonly requestSchemaName: "ApplyStaffPermissionProfileCommand";
            readonly responseSchemaName: "ApplyStaffPermissionProfileResponse";
        };
        readonly reorderStaffPermissionProfiles: {
            readonly publicName: "reorder-staff-permission-profiles";
            readonly requestSchemaName: "ReorderStaffPermissionProfilesCommand";
            readonly responseSchemaName: "ReorderStaffPermissionProfilesResponse";
        };
        readonly removeStaffPermissionProfile: {
            readonly publicName: "remove-staff-permission-profile";
            readonly requestSchemaName: "RemoveStaffPermissionProfileCommand";
            readonly responseSchemaName: "RemoveStaffPermissionProfileResponse";
        };
        readonly assignResourceToClass: {
            readonly publicName: "assign-resource-to-class";
            readonly requestSchemaName: "AssignResourceToClassCommand";
            readonly responseSchemaName: "ResourceAssignment";
        };
        readonly assignResourceToLessonSession: {
            readonly publicName: "assign-resource-to-lesson-session";
            readonly requestSchemaName: "AssignResourceToLessonSessionCommand";
            readonly responseSchemaName: "ResourceAssignment";
        };
        readonly removeResourceAssignment: {
            readonly publicName: "remove-resource-assignment";
            readonly requestSchemaName: "RemoveResourceAssignmentCommand";
            readonly responseSchemaName: "CommandMessageResponse";
        };
        readonly registerAttachment: {
            readonly publicName: "register-attachment";
            readonly requestSchemaName: "RegisterAttachmentCommand";
            readonly responseSchemaName: "Attachment";
        };
        readonly removeAttachment: {
            readonly publicName: "remove-attachment";
            readonly requestSchemaName: "RemoveAttachmentCommand";
            readonly responseSchemaName: "CommandMessageResponse";
        };
        readonly registerStudent: {
            readonly publicName: "register-student";
            readonly requestSchemaName: "RegisterStudentCommand";
            readonly responseSchemaName: "Student";
        };
        readonly enrollStudent: {
            readonly publicName: "enroll-student";
            readonly requestSchemaName: "EnrollStudentCommand";
            readonly responseSchemaName: "StudentClassEnrollment";
        };
        readonly linkGuardianToStudent: {
            readonly publicName: "link-guardian-to-student";
            readonly requestSchemaName: "LinkGuardianToStudentCommand";
            readonly responseSchemaName: "GuardianStudentLink";
        };
        readonly registerGuardian: {
            readonly publicName: "register-guardian";
            readonly requestSchemaName: "RegisterGuardianCommand";
            readonly responseSchemaName: "Guardian";
        };
        readonly promoteStudent: {
            readonly publicName: "promote-student";
            readonly requestSchemaName: "PromoteStudentCommand";
            readonly responseSchemaName: "StudentClassEnrollment";
        };
        readonly transferStudent: {
            readonly publicName: "transfer-student";
            readonly requestSchemaName: "TransferStudentCommand";
            readonly responseSchemaName: "StudentClassEnrollment";
        };
        readonly graduateStudent: {
            readonly publicName: "graduate-student";
            readonly requestSchemaName: "GraduateStudentCommand";
            readonly responseSchemaName: "StudentClassEnrollment";
        };
        readonly closeEnrollment: {
            readonly publicName: "close-enrollment";
            readonly requestSchemaName: "CloseEnrollmentCommand";
            readonly responseSchemaName: "StudentClassEnrollment";
        };
        readonly recordProgressionDecision: {
            readonly publicName: "record-progression-decision";
            readonly requestSchemaName: "RecordProgressionDecisionCommand";
            readonly responseSchemaName: "StudentClassEnrollment";
        };
        readonly updateStudentProfile: {
            readonly publicName: "update-student-profile";
            readonly requestSchemaName: "UpdateStudentProfileCommand";
            readonly responseSchemaName: "Student";
        };
        readonly updateStudentStatus: {
            readonly publicName: "update-student-status";
            readonly requestSchemaName: "UpdateStudentStatusCommand";
            readonly responseSchemaName: "Student";
        };
        readonly upsertStudentHealthProfile: {
            readonly publicName: "upsert-student-health-profile";
            readonly requestSchemaName: "UpsertStudentHealthProfileCommand";
            readonly responseSchemaName: "StudentHealthProfile";
        };
        readonly createStudentNote: {
            readonly publicName: "create-student-note";
            readonly requestSchemaName: "CreateStudentNoteCommand";
            readonly responseSchemaName: "StudentNote";
        };
        readonly updateStudentNote: {
            readonly publicName: "update-student-note";
            readonly requestSchemaName: "UpdateStudentNoteCommand";
            readonly responseSchemaName: "StudentNote";
        };
        readonly updateGuardianContactMethods: {
            readonly publicName: "update-guardian-contact-methods";
            readonly requestSchemaName: "UpdateGuardianContactMethodsCommand";
            readonly responseSchemaName: "Guardian";
        };
        readonly updateGuardianStudentLink: {
            readonly publicName: "update-guardian-student-link";
            readonly requestSchemaName: "UpdateGuardianStudentLinkCommand";
            readonly responseSchemaName: "GuardianStudentLink";
        };
        readonly configureSubject: {
            readonly publicName: "configure-subject";
            readonly requestSchemaName: "SubjectConfigCommand";
            readonly responseSchemaName: "Subject";
        };
        readonly configureSubjectCategory: {
            readonly publicName: "configure-subject-category";
            readonly requestSchemaName: "SubjectCategoryConfigCommand";
            readonly responseSchemaName: "SubjectCategory";
        };
        readonly configureSubjectMatter: {
            readonly publicName: "configure-subject-matter";
            readonly requestSchemaName: "SubjectMatterConfigCommand";
            readonly responseSchemaName: "SubjectMatter";
        };
        readonly offerSubjectToClass: {
            readonly publicName: "offer-subject-to-class";
            readonly requestSchemaName: "OfferSubjectToClassCommand";
            readonly responseSchemaName: "ClassSubject";
        };
        readonly assignMatterToClassSubject: {
            readonly publicName: "assign-matter-to-class-subject";
            readonly requestSchemaName: "AssignMatterToClassSubjectCommand";
            readonly responseSchemaName: "ClassSubjectMatter";
        };
        readonly offerSubjectToGradeLevel: {
            readonly publicName: "offer-subject-to-grade-level";
            readonly requestSchemaName: "OfferSubjectToGradeLevelCommand";
            readonly responseSchemaName: "GradeLevelSubject";
        };
        readonly removeSubjectFromGradeLevel: {
            readonly publicName: "remove-subject-from-grade-level";
            readonly requestSchemaName: "RemoveSubjectFromGradeLevelCommand";
            readonly responseSchemaName: "CommandMessageResponse";
        };
        readonly updateGradeLevelSubject: {
            readonly publicName: "update-grade-level-subject";
            readonly requestSchemaName: "UpdateGradeLevelSubjectCommand";
            readonly responseSchemaName: "GradeLevelSubject";
        };
        readonly assignMatterToGradeLevelSubject: {
            readonly publicName: "assign-matter-to-grade-level-subject";
            readonly requestSchemaName: "AssignMatterToGradeLevelSubjectCommand";
            readonly responseSchemaName: "GradeLevelSubjectMatter";
        };
        readonly addCustomClassSubject: {
            readonly publicName: "add-custom-class-subject";
            readonly requestSchemaName: "AddCustomClassSubjectCommand";
            readonly responseSchemaName: "ClassSubject";
        };
        readonly setClassSubjectOffered: {
            readonly publicName: "set-class-subject-offered";
            readonly requestSchemaName: "SetClassSubjectOfferedCommand";
            readonly responseSchemaName: "ClassSubject";
        };
        readonly configureClassSubjectTimetable: {
            readonly publicName: "configure-class-subject-timetable";
            readonly requestSchemaName: "ConfigureClassSubjectTimetableCommand";
            readonly responseSchemaName: "ClassSubject";
        };
        readonly recordLessonSessionProgress: {
            readonly publicName: "record-lesson-session-progress";
            readonly requestSchemaName: "RecordLessonSessionProgressCommand";
            readonly responseSchemaName: "ClassSubjectProgress";
        };
        readonly createGradeScale: {
            readonly publicName: "create-grade-scale";
            readonly requestSchemaName: "CreateGradeScaleCommand";
            readonly responseSchemaName: "GradeScale";
        };
        readonly createReportCardDefinition: {
            readonly publicName: "create-report-card-definition";
            readonly requestSchemaName: "CreateReportCardDefinitionCommand";
            readonly responseSchemaName: "ReportCardDefinition";
        };
        readonly createReportCardDefinitionSection: {
            readonly publicName: "create-report-card-definition-section";
            readonly requestSchemaName: "CreateReportCardDefinitionSectionCommand";
            readonly responseSchemaName: "ReportCardDefinitionSection";
        };
        readonly createAssessment: {
            readonly publicName: "create-assessment";
            readonly requestSchemaName: "CreateAssessmentCommand";
            readonly responseSchemaName: "Assessment";
        };
        readonly submitAssessmentMarks: {
            readonly publicName: "submit-assessment-marks";
            readonly requestSchemaName: "SubmitAssessmentMarksCommand";
            readonly responseSchemaName: "Assessment";
        };
        readonly saveTeacherAttendanceDraft: {
            readonly publicName: "save-teacher-attendance-draft";
            readonly requestSchemaName: "SaveTeacherAttendanceDraftCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly submitTeacherAttendance: {
            readonly publicName: "submit-teacher-attendance";
            readonly requestSchemaName: "SubmitTeacherAttendanceCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly recordTeacherAttendanceArrival: {
            readonly publicName: "record-teacher-attendance-arrival";
            readonly requestSchemaName: "RecordTeacherAttendanceArrivalCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly reviseAssessmentMarksCorrection: {
            readonly publicName: "revise-assessment-marks-correction";
            readonly requestSchemaName: "ReviseAssessmentMarksCorrectionCommand";
            readonly responseSchemaName: "AssessmentMarksCorrectionResponse";
        };
        readonly startConversation: {
            readonly publicName: "start-conversation";
            readonly requestSchemaName: "StartConversationCommand";
            readonly responseSchemaName: "ConversationResponse";
        };
        readonly replyConversation: {
            readonly publicName: "reply-conversation";
            readonly requestSchemaName: "ReplyConversationCommand";
            readonly responseSchemaName: "ConversationResponse";
        };
        readonly resolveConversation: {
            readonly publicName: "resolve-conversation";
            readonly requestSchemaName: "ResolveConversationCommand";
            readonly responseSchemaName: "ConversationResponse";
        };
        readonly markConversationRead: {
            readonly publicName: "mark-conversation-read";
            readonly requestSchemaName: "MarkConversationReadCommand";
            readonly responseSchemaName: "MarkConversationReadResponse";
        };
        readonly requestTeacherCorrection: {
            readonly publicName: "request-teacher-correction";
            readonly requestSchemaName: "RequestTeacherCorrectionCommand";
            readonly responseSchemaName: "TeacherCorrectionResponse";
        };
        readonly reviseTeacherCorrection: {
            readonly publicName: "revise-teacher-correction";
            readonly requestSchemaName: "ReviseTeacherCorrectionCommand";
            readonly responseSchemaName: "TeacherCorrectionResponse";
        };
        readonly approveTeacherCorrection: {
            readonly publicName: "approve-teacher-correction";
            readonly requestSchemaName: "ApproveTeacherCorrectionCommand";
            readonly responseSchemaName: "TeacherCorrectionResponse";
        };
        readonly rejectTeacherCorrection: {
            readonly publicName: "reject-teacher-correction";
            readonly requestSchemaName: "RejectTeacherCorrectionCommand";
            readonly responseSchemaName: "TeacherCorrectionResponse";
        };
        readonly withdrawTeacherCorrection: {
            readonly publicName: "withdraw-teacher-correction";
            readonly requestSchemaName: "WithdrawTeacherCorrectionCommand";
            readonly responseSchemaName: "TeacherCorrectionResponse";
        };
        readonly saveTeacherLogbook: {
            readonly publicName: "save-teacher-logbook";
            readonly requestSchemaName: "SaveTeacherLogbookCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly validateTeacherLogbook: {
            readonly publicName: "validate-teacher-logbook";
            readonly requestSchemaName: "ValidateTeacherLogbookCommand";
            readonly responseSchemaName: "TeacherWorkflowStateListResponse";
        };
        readonly editTeacherIncident: {
            readonly publicName: "edit-teacher-incident";
            readonly requestSchemaName: "EditTeacherIncidentCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly takeOverTeacherIncident: {
            readonly publicName: "take-over-teacher-incident";
            readonly requestSchemaName: "TakeOverTeacherIncidentCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly appendIncidentFollowUp: {
            readonly publicName: "append-incident-follow-up";
            readonly requestSchemaName: "AppendIncidentFollowUpCommand";
            readonly responseSchemaName: "TeacherWorkflowStateResponse";
        };
        readonly requestAssessmentMarksCorrection: {
            readonly publicName: "request-assessment-marks-correction";
            readonly requestSchemaName: "RequestAssessmentMarksCorrectionCommand";
            readonly responseSchemaName: "AssessmentMarksCorrectionResponse";
        };
        readonly approveAssessmentMarksCorrection: {
            readonly publicName: "approve-assessment-marks-correction";
            readonly requestSchemaName: "ApproveAssessmentMarksCorrectionCommand";
            readonly responseSchemaName: "AssessmentMarksCorrectionResponse";
        };
        readonly rejectAssessmentMarksCorrection: {
            readonly publicName: "reject-assessment-marks-correction";
            readonly requestSchemaName: "RejectAssessmentMarksCorrectionCommand";
            readonly responseSchemaName: "AssessmentMarksCorrectionResponse";
        };
        readonly withdrawAssessmentMarksCorrection: {
            readonly publicName: "withdraw-assessment-marks-correction";
            readonly requestSchemaName: "WithdrawAssessmentMarksCorrectionCommand";
            readonly responseSchemaName: "AssessmentMarksCorrectionResponse";
        };
        readonly completeAssessment: {
            readonly publicName: "complete-assessment";
            readonly requestSchemaName: "CompleteAssessmentCommand";
            readonly responseSchemaName: "Assessment";
        };
        readonly recordAssessmentResults: {
            readonly publicName: "record-assessment-results";
            readonly requestSchemaName: "RecordAssessmentResultsCommand";
            readonly responseSchemaName: "RecordAssessmentResultsResponse";
        };
        readonly recordAssessmentResult: {
            readonly publicName: "record-assessment-result";
            readonly requestSchemaName: "RecordAssessmentResultCommand";
            readonly responseSchemaName: "AssessmentResult";
        };
        readonly recordAssessmentResultCompliance: {
            readonly publicName: "record-assessment-result-compliance";
            readonly requestSchemaName: "RecordAssessmentResultComplianceCommand";
            readonly responseSchemaName: "AssessmentResult";
        };
        readonly listClassSubjectAssessmentResultsForPeriod: {
            readonly publicName: "list-class-subject-assessment-results-for-period";
            readonly requestSchemaName: "ListClassSubjectAssessmentResultsForPeriodCommand";
            readonly responseSchemaName: "AssessmentResultCommandListResponse";
        };
        readonly generateReportCardResult: {
            readonly publicName: "generate-report-card-result";
            readonly requestSchemaName: "GenerateReportCardResultCommand";
            readonly responseSchemaName: "ReportCardResult";
        };
        readonly writeHomeroomReportComment: {
            readonly publicName: "write-homeroom-report-comment";
            readonly requestSchemaName: "WriteHomeroomReportCommentCommand";
            readonly responseSchemaName: "ReportCardResult";
        };
        readonly writeReportCardSectionComments: {
            readonly publicName: "write-report-card-section-comments";
            readonly requestSchemaName: "WriteReportCardSectionCommentsCommand";
            readonly responseSchemaName: "ReportCardResult";
        };
        readonly publishReportCardResult: {
            readonly publicName: "publish-report-card-result";
            readonly requestSchemaName: "PublishReportCardResultCommand";
            readonly responseSchemaName: "ReportCardResult";
        };
        readonly renderClassLogbook: {
            readonly publicName: "render-class-logbook";
            readonly requestSchemaName: "RenderClassLogbookCommand";
            readonly responseSchemaName: "DocumentIssuanceProjectionResponse";
        };
        readonly requestDocumentIssuance: {
            readonly publicName: "request-document-issuance";
            readonly requestSchemaName: "RequestDocumentIssuanceCommand";
            readonly responseSchemaName: "DocumentIssuanceProjectionResponse";
        };
        readonly requestDocumentIssuanceBatch: {
            readonly publicName: "request-document-issuance-batch";
            readonly requestSchemaName: "RequestDocumentIssuanceBatchCommand";
            readonly responseSchemaName: "DocumentIssuanceBatchResponse";
        };
        readonly retryDocumentIssuance: {
            readonly publicName: "retry-document-issuance";
            readonly requestSchemaName: "RetryDocumentIssuanceCommand";
            readonly responseSchemaName: "DocumentIssuanceProjectionResponse";
        };
        readonly correctDocumentIssuance: {
            readonly publicName: "correct-document-issuance";
            readonly requestSchemaName: "CorrectDocumentIssuanceCommand";
            readonly responseSchemaName: "DocumentIssuanceProjectionResponse";
        };
        readonly voidDocumentIssuance: {
            readonly publicName: "void-document-issuance";
            readonly requestSchemaName: "VoidDocumentIssuanceCommand";
            readonly responseSchemaName: "DocumentIssuanceProjectionResponse";
        };
        readonly previewDocument: {
            readonly publicName: "preview-document";
            readonly requestSchemaName: "PreviewDocumentCommand";
            readonly responseSchemaName: "DocumentIssuanceProjectionResponse";
        };
        readonly createSchoolIssuanceAssetUpload: {
            readonly publicName: "create-school-issuance-asset-upload";
            readonly requestSchemaName: "CreateSchoolIssuanceAssetUploadCommand";
            readonly responseSchemaName: "CreateSchoolIssuanceAssetUploadResponse";
        };
        readonly completeSchoolIssuanceAssetUpload: {
            readonly publicName: "complete-school-issuance-asset-upload";
            readonly requestSchemaName: "CompleteSchoolIssuanceAssetUploadCommand";
            readonly responseSchemaName: "Attachment";
        };
        readonly clearSchoolIssuanceAsset: {
            readonly publicName: "clear-school-issuance-asset";
            readonly requestSchemaName: "ClearSchoolIssuanceAssetCommand";
            readonly responseSchemaName: "School";
        };
        readonly recordIncident: {
            readonly publicName: "record-incident";
            readonly requestSchemaName: "RecordIncidentCommand";
            readonly responseSchemaName: "Incident";
        };
        readonly addStudentInvolvement: {
            readonly publicName: "add-student-involvement";
            readonly requestSchemaName: "AddStudentInvolvementCommand";
            readonly responseSchemaName: "StudentIncidentInvolvement";
        };
        readonly configureDisciplinaryAction: {
            readonly publicName: "configure-disciplinary-action";
            readonly requestSchemaName: "DisciplinaryActionConfigCommand";
            readonly responseSchemaName: "DisciplinaryAction";
        };
        readonly applyDisciplinaryAction: {
            readonly publicName: "apply-disciplinary-action";
            readonly requestSchemaName: "ApplyDisciplinaryActionCommand";
            readonly responseSchemaName: "StudentDisciplinaryAction";
        };
        readonly updateStudentDisciplinaryActionStatus: {
            readonly publicName: "update-student-disciplinary-action-status";
            readonly requestSchemaName: "UpdateStudentDisciplinaryActionStatusCommand";
            readonly responseSchemaName: "StudentDisciplinaryAction";
        };
        readonly resolveIncident: {
            readonly publicName: "resolve-incident";
            readonly requestSchemaName: "ResolveIncidentCommand";
            readonly responseSchemaName: "Incident";
        };
        readonly resolveIncidentWithOutcomes: {
            readonly publicName: "resolve-incident-with-outcomes";
            readonly requestSchemaName: "ResolveIncidentWithOutcomesCommand";
            readonly responseSchemaName: "ResolveIncidentWithOutcomesResponse";
        };
        readonly createFee: {
            readonly publicName: "create-fee";
            readonly requestSchemaName: "CreateFeeCommand";
            readonly responseSchemaName: "RetiredFinanceCommandResponse";
        };
        readonly assignFeeToStudent: {
            readonly publicName: "assign-fee-to-student";
            readonly requestSchemaName: "AssignFeeToStudentCommand";
            readonly responseSchemaName: "RetiredFinanceCommandResponse";
        };
        readonly recordPayment: {
            readonly publicName: "record-payment";
            readonly requestSchemaName: "RecordPaymentCommand";
            readonly responseSchemaName: "Payment";
        };
        readonly reversePayment: {
            readonly publicName: "reverse-payment";
            readonly requestSchemaName: "ReversePaymentCommand";
            readonly responseSchemaName: "Payment";
        };
        readonly cancelPayment: {
            readonly publicName: "cancel-payment";
            readonly requestSchemaName: "CancelPaymentCommand";
            readonly responseSchemaName: "RetiredFinanceCommandResponse";
        };
        readonly adjustStudentFee: {
            readonly publicName: "adjust-student-fee";
            readonly requestSchemaName: "AdjustStudentFeeCommand";
            readonly responseSchemaName: "RetiredFinanceCommandResponse";
        };
        readonly cancelStudentFee: {
            readonly publicName: "cancel-student-fee";
            readonly requestSchemaName: "CancelStudentFeeCommand";
            readonly responseSchemaName: "RetiredFinanceCommandResponse";
        };
        readonly createCatalogService: {
            readonly publicName: "create-catalog-service";
            readonly requestSchemaName: "CreateCatalogServiceCommand";
            readonly responseSchemaName: "CatalogService";
        };
        readonly updateCatalogService: {
            readonly publicName: "update-catalog-service";
            readonly requestSchemaName: "UpdateCatalogServiceCommand";
            readonly responseSchemaName: "CatalogService";
        };
        readonly activateCatalogService: {
            readonly publicName: "activate-catalog-service";
            readonly requestSchemaName: "CatalogServiceIdCommand";
            readonly responseSchemaName: "CatalogService";
        };
        readonly archiveCatalogService: {
            readonly publicName: "archive-catalog-service";
            readonly requestSchemaName: "CatalogServiceIdCommand";
            readonly responseSchemaName: "CatalogService";
        };
        readonly enrollStudentInService: {
            readonly publicName: "enroll-student-in-service";
            readonly requestSchemaName: "EnrollStudentInServiceCommand";
            readonly responseSchemaName: "StudentServiceEnrollment";
        };
        readonly enrollStudentsInService: {
            readonly publicName: "enroll-students-in-service";
            readonly requestSchemaName: "EnrollStudentsInServiceCommand";
            readonly responseSchemaName: "StudentServiceEnrollmentCommandListResponse";
        };
        readonly cancelServiceEnrollment: {
            readonly publicName: "cancel-service-enrollment";
            readonly requestSchemaName: "CancelServiceEnrollmentCommand";
            readonly responseSchemaName: "StudentServiceEnrollment";
        };
        readonly materializeOneTimeCharge: {
            readonly publicName: "materialize-one-time-charge";
            readonly requestSchemaName: "MaterializeOneTimeChargeCommand";
            readonly responseSchemaName: "StudentCharge";
        };
        readonly adjustStudentCharge: {
            readonly publicName: "adjust-student-charge";
            readonly requestSchemaName: "AdjustStudentChargeCommand";
            readonly responseSchemaName: "StudentCharge";
        };
        readonly waiveStudentCharge: {
            readonly publicName: "waive-student-charge";
            readonly requestSchemaName: "WaiveStudentChargeCommand";
            readonly responseSchemaName: "StudentCharge";
        };
        readonly cancelStudentCharge: {
            readonly publicName: "cancel-student-charge";
            readonly requestSchemaName: "CancelStudentChargeCommand";
            readonly responseSchemaName: "StudentCharge";
        };
        readonly allocateAccountBalance: {
            readonly publicName: "allocate-account-balance";
            readonly requestSchemaName: "AllocateAccountBalanceCommand";
            readonly responseSchemaName: "AllocationPreviewResponse";
        };
        readonly reverseAllocation: {
            readonly publicName: "reverse-allocation";
            readonly requestSchemaName: "ReverseAllocationCommand";
            readonly responseSchemaName: "AllocationResponse";
        };
        readonly refundAvailableBalance: {
            readonly publicName: "refund-available-balance";
            readonly requestSchemaName: "RefundAvailableBalanceCommand";
            readonly responseSchemaName: "Payment";
        };
        readonly createProfilePhotoUpload: {
            readonly publicName: "create-profile-photo-upload";
            readonly requestSchemaName: "CreateProfilePhotoUploadCommand";
            readonly responseSchemaName: "CreateProfilePhotoUploadResponse";
        };
        readonly completeProfilePhotoUpload: {
            readonly publicName: "complete-profile-photo-upload";
            readonly requestSchemaName: "CompleteProfilePhotoUploadCommand";
            readonly responseSchemaName: "Attachment";
        };
        readonly submitStudentPhoto: {
            readonly publicName: "submit-student-photo";
            readonly requestSchemaName: "SubmitStudentPhotoCommand";
            readonly responseSchemaName: "StudentPhotoSubmission";
        };
        readonly withdrawStudentPhotoSubmission: {
            readonly publicName: "withdraw-student-photo-submission";
            readonly requestSchemaName: "WithdrawStudentPhotoSubmissionCommand";
            readonly responseSchemaName: "StudentPhotoSubmission";
        };
        readonly reviewStudentPhoto: {
            readonly publicName: "review-student-photo";
            readonly requestSchemaName: "ReviewStudentPhotoCommand";
            readonly responseSchemaName: "StudentPhotoSubmission";
        };
        readonly publishStudentPhoto: {
            readonly publicName: "publish-student-photo";
            readonly requestSchemaName: "PublishStudentPhotoCommand";
            readonly responseSchemaName: "Student";
        };
        readonly createFamilyFeedbackCampaign: {
            readonly publicName: "create-family-feedback-campaign";
            readonly requestSchemaName: "CreateFamilyFeedbackCampaignCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly updateFamilyFeedbackCampaign: {
            readonly publicName: "update-family-feedback-campaign";
            readonly requestSchemaName: "UpdateFamilyFeedbackCampaignCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly assignFamilyFeedbackModerator: {
            readonly publicName: "assign-family-feedback-moderator";
            readonly requestSchemaName: "AssignFamilyFeedbackModeratorCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly scheduleFamilyFeedbackCampaign: {
            readonly publicName: "schedule-family-feedback-campaign";
            readonly requestSchemaName: "FamilyFeedbackCampaignIdCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly openFamilyFeedbackCampaign: {
            readonly publicName: "open-family-feedback-campaign";
            readonly requestSchemaName: "FamilyFeedbackCampaignIdCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly closeFamilyFeedbackCampaign: {
            readonly publicName: "close-family-feedback-campaign";
            readonly requestSchemaName: "FamilyFeedbackCampaignIdCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly cancelFamilyFeedbackCampaign: {
            readonly publicName: "cancel-family-feedback-campaign";
            readonly requestSchemaName: "FamilyFeedbackCampaignIdCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly submitFamilyFeedbackResponse: {
            readonly publicName: "submit-family-feedback-response";
            readonly requestSchemaName: "SubmitFamilyFeedbackResponseCommand";
            readonly responseSchemaName: "FamilyFeedbackSubmitReceipt";
        };
        readonly saveFamilyFeedbackThemeDraft: {
            readonly publicName: "save-family-feedback-theme-draft";
            readonly requestSchemaName: "SaveFamilyFeedbackThemeDraftCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly publishFamilyFeedbackCampaign: {
            readonly publicName: "publish-family-feedback-campaign";
            readonly requestSchemaName: "FamilyFeedbackCampaignIdCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly archiveFamilyFeedbackCampaign: {
            readonly publicName: "archive-family-feedback-campaign";
            readonly requestSchemaName: "FamilyFeedbackCampaignIdCommand";
            readonly responseSchemaName: "FamilyFeedbackCampaignCommandResponse";
        };
        readonly createSchedule: {
            readonly publicName: "create-schedule";
            readonly requestSchemaName: "CreateScheduleCommand";
            readonly responseSchemaName: "Schedule";
        };
        readonly saveSchedule: {
            readonly publicName: "save-schedule";
            readonly requestSchemaName: "SaveScheduleCommand";
            readonly responseSchemaName: "Schedule";
        };
        readonly materializeSchedule: {
            readonly publicName: "materialize-schedule";
            readonly requestSchemaName: "MaterializeScheduleCommand";
            readonly responseSchemaName: "MaterializedOccurrenceCommandListResponse";
        };
        readonly createCalendarEvent: {
            readonly publicName: "create-calendar-event";
            readonly requestSchemaName: "CreateCalendarEventCommand";
            readonly responseSchemaName: "CalendarEvent";
        };
        readonly cancelLessonSession: {
            readonly publicName: "cancel-lesson-session";
            readonly requestSchemaName: "CancelLessonSessionCommand";
            readonly responseSchemaName: "LessonSession";
        };
        readonly cancelActivitySession: {
            readonly publicName: "cancel-activity-session";
            readonly requestSchemaName: "CancelActivitySessionCommand";
            readonly responseSchemaName: "ActivitySession";
        };
        readonly rescheduleOccurrence: {
            readonly publicName: "reschedule-occurrence";
            readonly requestSchemaName: "RescheduleOccurrenceCommand";
            readonly responseSchemaName: "MaterializedOccurrenceCommandResponse";
        };
        readonly recordAttendance: {
            readonly publicName: "record-attendance";
            readonly requestSchemaName: "RecordAttendanceCommand";
            readonly responseSchemaName: "Attendance";
        };
        readonly recordDailyAttendance: {
            readonly publicName: "record-daily-attendance";
            readonly requestSchemaName: "RecordDailyAttendanceCommand";
            readonly responseSchemaName: "Attendance";
        };
        readonly recordLessonSessionAttendance: {
            readonly publicName: "record-lesson-session-attendance";
            readonly requestSchemaName: "RecordLessonSessionAttendanceCommand";
            readonly responseSchemaName: "AttendanceCommandListResponse";
        };
        readonly recordClassDailyAttendance: {
            readonly publicName: "record-class-daily-attendance";
            readonly requestSchemaName: "RecordClassDailyAttendanceCommand";
            readonly responseSchemaName: "AttendanceCommandListResponse";
        };
        readonly reviewAttendanceJustification: {
            readonly publicName: "review-attendance-justification";
            readonly requestSchemaName: "ReviewAttendanceJustificationCommand";
            readonly responseSchemaName: "Attendance";
        };
        readonly requestAttendanceJustification: {
            readonly publicName: "request-attendance-justification";
            readonly requestSchemaName: "RequestAttendanceJustificationCommand";
            readonly responseSchemaName: "Attendance";
        };
        readonly generateClassGroupTimetable: {
            readonly publicName: "generate-class-group-timetable";
            readonly requestSchemaName: "GenerateClassGroupTimetableCommand";
            readonly responseSchemaName: "GenerateClassGroupTimetableResponse";
        };
        readonly generateSchoolTimetable: {
            readonly publicName: "generate-school-timetable";
            readonly requestSchemaName: "GenerateSchoolTimetableCommand";
            readonly responseSchemaName: "GenerateSchoolTimetableResponse";
        };
        readonly publishClassGroupTimetable: {
            readonly publicName: "publish-class-group-timetable";
            readonly requestSchemaName: "PublishClassGroupTimetableCommand";
            readonly responseSchemaName: "PublishClassGroupTimetableResponse";
        };
        readonly republishClassGroupTimetable: {
            readonly publicName: "republish-class-group-timetable";
            readonly requestSchemaName: "RepublishClassGroupTimetableCommand";
            readonly responseSchemaName: "RepublishClassGroupTimetableResponse";
        };
        readonly createAnnouncement: {
            readonly publicName: "create-announcement";
            readonly requestSchemaName: "CreateAnnouncementCommand";
            readonly responseSchemaName: "Announcement";
        };
        readonly addTarget: {
            readonly publicName: "add-target";
            readonly requestSchemaName: "AddAnnouncementTargetCommand";
            readonly responseSchemaName: "AnnouncementTarget";
        };
        readonly publishAnnouncement: {
            readonly publicName: "publish-announcement";
            readonly requestSchemaName: "PublishAnnouncementCommand";
            readonly responseSchemaName: "Announcement";
        };
        readonly recordDelivery: {
            readonly publicName: "record-delivery";
            readonly requestSchemaName: "RecordMessageDeliveryCommand";
            readonly responseSchemaName: "MessageDelivery";
        };
        readonly materializeDeliveries: {
            readonly publicName: "materialize-deliveries";
            readonly requestSchemaName: "MaterializeDeliveriesCommand";
            readonly responseSchemaName: "MessageDeliveryCommandListResponse";
        };
        readonly applyDeliveryEvent: {
            readonly publicName: "apply-delivery-event";
            readonly requestSchemaName: "ApplyDeliveryEventCommand";
            readonly responseSchemaName: "MessageDelivery";
        };
        readonly markDeliveryRead: {
            readonly publicName: "mark-delivery-read";
            readonly requestSchemaName: "MarkDeliveryReadCommand";
            readonly responseSchemaName: "MessageDelivery";
        };
        readonly updateNotificationContact: {
            readonly publicName: "update-notification-contact";
            readonly requestSchemaName: "UpdateNotificationContactCommand";
            readonly responseSchemaName: "UpdateNotificationContactResponse";
        };
        readonly registerPushDevice: {
            readonly publicName: "register-push-device";
            readonly requestSchemaName: "RegisterPushDeviceCommand";
            readonly responseSchemaName: "CommandMessageResponse";
        };
        readonly unregisterPushDevice: {
            readonly publicName: "unregister-push-device";
            readonly requestSchemaName: "UnregisterPushDeviceCommand";
            readonly responseSchemaName: "CommandMessageResponse";
        };
        readonly updateSchoolNotificationTemplates: {
            readonly publicName: "update-school-notification-templates";
            readonly requestSchemaName: "UpdateSchoolNotificationTemplatesCommand";
            readonly responseSchemaName: "SchoolNotificationTemplates";
        };
        readonly resetSchoolNotificationTemplates: {
            readonly publicName: "reset-school-notification-templates";
            readonly requestSchemaName: "ResetSchoolNotificationTemplatesCommand";
            readonly responseSchemaName: "SchoolNotificationTemplates";
        };
    };
    readonly queries: {
        readonly getTeacherAttendanceCall: {
            readonly publicName: "get-teacher-attendance-call";
            readonly requestSchemaName: "GetTeacherAttendanceCallQuery";
            readonly responseSchemaName: "TeacherAttendanceCallResponse";
        };
        readonly getTeacherWorkflowState: {
            readonly publicName: "get-teacher-workflow-state";
            readonly requestSchemaName: "GetTeacherWorkflowStateQuery";
            readonly responseSchemaName: "TeacherWorkflowEligibilityResponse";
        };
        readonly listConversationRecipients: {
            readonly publicName: "list-conversation-recipients";
            readonly requestSchemaName: "ConversationRecipientsQuery";
            readonly responseSchemaName: "ConversationRecipientsResponse";
        };
        readonly listConversations: {
            readonly publicName: "list-conversations";
            readonly requestSchemaName: "ConversationsQuery";
            readonly responseSchemaName: "ConversationsResponse";
        };
        readonly getConversation: {
            readonly publicName: "get-conversation";
            readonly requestSchemaName: "ConversationDetailQuery";
            readonly responseSchemaName: "ConversationDetailResponse";
        };
        readonly listTeacherCorrections: {
            readonly publicName: "list-teacher-corrections";
            readonly requestSchemaName: "ListTeacherCorrectionsQuery";
            readonly responseSchemaName: "TeacherCorrectionsResponse";
        };
        readonly getTeacherCorrection: {
            readonly publicName: "get-teacher-correction";
            readonly requestSchemaName: "GetTeacherCorrectionQuery";
            readonly responseSchemaName: "TeacherCorrectionDetailResponse";
        };
        readonly getAssessmentMarksReview: {
            readonly publicName: "get-assessment-marks-review";
            readonly requestSchemaName: "GetAssessmentMarksReviewQuery";
            readonly responseSchemaName: "AssessmentMarksReviewResponse";
        };
        readonly listAssessmentMarksReviews: {
            readonly publicName: "list-assessment-marks-reviews";
            readonly requestSchemaName: "ListAssessmentMarksReviewsQuery";
            readonly responseSchemaName: "AssessmentMarksReviewsResponse";
        };
        readonly getOverdueFeeCount: {
            readonly publicName: "get-overdue-fee-count";
            readonly requestSchemaName: "GetOverdueFeeCountQuery";
            readonly responseSchemaName: "CountResponse";
        };
        readonly getPublishedReportCardCount: {
            readonly publicName: "get-published-report-card-count";
            readonly requestSchemaName: "GetPublishedReportCardCountQuery";
            readonly responseSchemaName: "CountResponse";
        };
        readonly getSchoolOverview: {
            readonly publicName: "get-school-overview";
            readonly requestSchemaName: "GetSchoolOverviewQuery";
            readonly responseSchemaName: "SchoolOverviewResponse";
        };
        readonly getAppShellCounts: {
            readonly publicName: "get-app-shell-counts";
            readonly requestSchemaName: "GetAppShellCountsQuery";
            readonly responseSchemaName: "AppShellCountsResponse";
        };
        readonly getClassGroupTimetable: {
            readonly publicName: "get-class-group-timetable";
            readonly requestSchemaName: "GetClassGroupTimetableQuery";
            readonly responseSchemaName: "ClassGroupTimetableResponse";
        };
        readonly getTeacherTimetable: {
            readonly publicName: "get-teacher-timetable";
            readonly requestSchemaName: "GetTeacherTimetableQuery";
            readonly responseSchemaName: "TeacherTimetableResponse";
        };
        readonly resolveTimetableSpace: {
            readonly publicName: "resolve-timetable-space";
            readonly requestSchemaName: "ResolveTimetableSpaceQuery";
            readonly responseSchemaName: "ResolvedTimetableSpaceResponse";
        };
        readonly getStudentFinanceSummary: {
            readonly publicName: "get-student-finance-summary";
            readonly requestSchemaName: "GetStudentFinanceSummaryQuery";
            readonly responseSchemaName: "StudentFinanceSummaryResponse";
        };
        readonly getAccountStatement: {
            readonly publicName: "get-account-statement";
            readonly requestSchemaName: "GetAccountStatementQuery";
            readonly responseSchemaName: "AccountStatementResponse";
        };
        readonly getSchoolFinanceAging: {
            readonly publicName: "get-school-finance-aging";
            readonly requestSchemaName: "GetSchoolFinanceAgingQuery";
            readonly responseSchemaName: "SchoolFinanceAgingResponse";
        };
        readonly getFinanceReconciliation: {
            readonly publicName: "get-finance-reconciliation";
            readonly requestSchemaName: "GetFinanceReconciliationQuery";
            readonly responseSchemaName: "FinanceReconciliationResponse";
        };
        readonly previewAccountAllocation: {
            readonly publicName: "preview-account-allocation";
            readonly requestSchemaName: "PreviewAccountAllocationQuery";
            readonly responseSchemaName: "AllocationPreviewQueryResponse";
        };
        readonly getRelatedFamilyFinanceOverview: {
            readonly publicName: "get-related-family-finance-overview";
            readonly requestSchemaName: "GetRelatedFamilyFinanceOverviewQuery";
            readonly responseSchemaName: "RelatedFamilyFinanceOverviewResponse";
        };
        readonly getStudentAccountStatement: {
            readonly publicName: "get-student-account-statement";
            readonly requestSchemaName: "GetStudentAccountStatementQuery";
            readonly responseSchemaName: "StudentAccountStatementResponse";
        };
        readonly listOpenDueCharges: {
            readonly publicName: "list-open-due-charges";
            readonly requestSchemaName: "ListOpenDueChargesQuery";
            readonly responseSchemaName: "OpenDueChargesResponse";
        };
        readonly getPaymentSettlementHistory: {
            readonly publicName: "get-payment-settlement-history";
            readonly requestSchemaName: "GetPaymentSettlementHistoryQuery";
            readonly responseSchemaName: "PaymentSettlementHistoryResponse";
        };
        readonly reconcileStudentYearAccount: {
            readonly publicName: "reconcile-student-year-account";
            readonly requestSchemaName: "ReconcileStudentYearAccountQuery";
            readonly responseSchemaName: "StudentYearAccountReconciliationResponse";
        };
        readonly reconcileSchoolFinance: {
            readonly publicName: "reconcile-school-finance";
            readonly requestSchemaName: "GetFinanceReconciliationQuery";
            readonly responseSchemaName: "FinanceReconciliationResponse";
        };
        readonly listDocumentTemplates: {
            readonly publicName: "list-document-templates";
            readonly requestSchemaName: "ListDocumentTemplatesQuery";
            readonly responseSchemaName: "DocumentTemplateCatalogResponse";
        };
        readonly listDocumentIssuances: {
            readonly publicName: "list-document-issuances";
            readonly requestSchemaName: "ListDocumentIssuancesQuery";
            readonly responseSchemaName: "DocumentIssuanceListResponse";
        };
        readonly getDocumentIssuance: {
            readonly publicName: "get-document-issuance";
            readonly requestSchemaName: "GetDocumentIssuanceQuery";
            readonly responseSchemaName: "DocumentIssuanceProjection";
        };
        readonly grantDocumentDownload: {
            readonly publicName: "grant-document-download";
            readonly requestSchemaName: "GrantDocumentDownloadQuery";
            readonly responseSchemaName: "DocumentDownloadGrantResponse";
        };
        readonly grantDocumentBundleDownload: {
            readonly publicName: "grant-document-bundle-download";
            readonly requestSchemaName: "GrantDocumentBundleDownloadQuery";
            readonly responseSchemaName: "DocumentDownloadBundleResponse";
        };
        readonly listFamilyFeedbackCampaigns: {
            readonly publicName: "list-family-feedback-campaigns";
            readonly requestSchemaName: "ListFamilyFeedbackCampaignsQuery";
            readonly responseSchemaName: "FamilyFeedbackCampaignProjectionList";
        };
        readonly getFamilyFeedbackCampaign: {
            readonly publicName: "get-family-feedback-campaign";
            readonly requestSchemaName: "GetFamilyFeedbackCampaignQuery";
            readonly responseSchemaName: "FamilyFeedbackCampaignProjection";
        };
        readonly previewFamilyFeedbackAudience: {
            readonly publicName: "preview-family-feedback-audience";
            readonly requestSchemaName: "PreviewFamilyFeedbackAudienceQuery";
            readonly responseSchemaName: "FamilyFeedbackAudiencePreview";
        };
        readonly getFamilyFeedbackInstrument: {
            readonly publicName: "get-family-feedback-instrument";
            readonly requestSchemaName: "GetFamilyFeedbackInstrumentQuery";
            readonly responseSchemaName: "FamilyFeedbackInstrument";
        };
        readonly listGuardianFamilyFeedbackCampaigns: {
            readonly publicName: "list-guardian-family-feedback-campaigns";
            readonly requestSchemaName: "ListGuardianFamilyFeedbackCampaignsQuery";
            readonly responseSchemaName: "GuardianFamilyFeedbackCampaignList";
        };
        readonly getGuardianFamilyFeedbackQuestionnaire: {
            readonly publicName: "get-guardian-family-feedback-questionnaire";
            readonly requestSchemaName: "GetGuardianFamilyFeedbackQuestionnaireQuery";
            readonly responseSchemaName: "GuardianFamilyFeedbackQuestionnaire";
        };
        readonly listFamilyFeedbackComments: {
            readonly publicName: "list-family-feedback-comments";
            readonly requestSchemaName: "ListFamilyFeedbackCommentsQuery";
            readonly responseSchemaName: "FamilyFeedbackComments";
        };
        readonly getFamilyFeedbackAggregateReview: {
            readonly publicName: "get-family-feedback-aggregate-review";
            readonly requestSchemaName: "GetFamilyFeedbackAggregateReviewQuery";
            readonly responseSchemaName: "FamilyFeedbackAggregate";
        };
        readonly listTeacherFamilyFeedbackResults: {
            readonly publicName: "list-teacher-family-feedback-results";
            readonly requestSchemaName: "ListTeacherFamilyFeedbackResultsQuery";
            readonly responseSchemaName: "TeacherFamilyFeedbackResultList";
        };
        readonly getTeacherFamilyFeedbackResult: {
            readonly publicName: "get-teacher-family-feedback-result";
            readonly requestSchemaName: "GetTeacherFamilyFeedbackResultQuery";
            readonly responseSchemaName: "TeacherFamilyFeedbackResult";
        };
    };
    readonly auth: {
        readonly methods: {
            readonly method: "GET";
            readonly path: "/auth/edaya/methods";
            readonly responseSchemaName: "AuthMethods";
            readonly basePath: "root";
        };
        readonly startOtp: {
            readonly method: "POST";
            readonly path: "/auth/edaya/otp/start";
            readonly requestSchemaName: "AuthStart";
            readonly responseSchemaName: "AuthPrimaryStatus";
            readonly basePath: "root";
        };
        readonly statusOtp: {
            readonly method: "POST";
            readonly path: "/auth/edaya/otp/status";
            readonly requestSchemaName: "AuthChallengeInput";
            readonly responseSchemaName: "AuthPrimaryStatus";
            readonly basePath: "root";
        };
        readonly resendOtp: {
            readonly method: "POST";
            readonly path: "/auth/edaya/otp/resend";
            readonly requestSchemaName: "AuthResend";
            readonly responseSchemaName: "AuthPrimaryStatus";
            readonly basePath: "root";
        };
        readonly verifyOtp: {
            readonly method: "POST";
            readonly path: "/auth/edaya/otp/verify";
            readonly requestSchemaName: "AuthProof";
            readonly responseSchemaName: "AuthOutcome";
            readonly basePath: "root";
        };
        readonly verifyTotp: {
            readonly method: "POST";
            readonly path: "/auth/edaya/totp/verify";
            readonly requestSchemaName: "AuthProof";
            readonly responseSchemaName: "AuthOutcome";
            readonly basePath: "root";
        };
        readonly enroll: {
            readonly method: "POST";
            readonly path: "/auth/edaya/totp/enroll";
            readonly requestSchemaName: "AuthEnrollmentInput";
            readonly responseSchemaName: "AuthEnrollment";
            readonly basePath: "root";
        };
        readonly confirmEnrollment: {
            readonly method: "POST";
            readonly path: "/auth/edaya/totp/confirm";
            readonly requestSchemaName: "AuthProof";
            readonly responseSchemaName: "AuthOutcome";
            readonly basePath: "root";
        };
        readonly recover: {
            readonly method: "POST";
            readonly path: "/auth/edaya/recovery";
            readonly requestSchemaName: "AuthProof";
            readonly responseSchemaName: "AuthEnrollment";
            readonly basePath: "root";
        };
        readonly linkIdentifier: {
            readonly method: "POST";
            readonly path: "/auth/edaya/identifiers/start";
            readonly requestSchemaName: "AuthStart";
            readonly responseSchemaName: "AuthPrimaryStatus";
            readonly basePath: "root";
        };
        readonly unlinkIdentifier: {
            readonly method: "POST";
            readonly path: "/auth/edaya/identifiers/unlink";
            readonly requestSchemaName: "AuthUnlink";
            readonly responseSchemaName: "AuthSuccess";
            readonly basePath: "root";
        };
        readonly security: {
            readonly method: "POST";
            readonly path: "/auth/edaya/security";
            readonly requestSchemaName: "AuthEmptyInput";
            readonly responseSchemaName: "AuthSecurity";
            readonly basePath: "root";
        };
        readonly disableTotp: {
            readonly method: "POST";
            readonly path: "/auth/edaya/totp/disable";
            readonly requestSchemaName: "AuthEmptyInput";
            readonly responseSchemaName: "AuthSuccess";
            readonly basePath: "root";
        };
        readonly getSession: {
            readonly method: "POST";
            readonly path: "/auth/edaya/session";
            readonly requestSchemaName: "AuthEmptyInput";
            readonly responseSchemaName: "AuthSnapshot";
            readonly basePath: "root";
        };
        readonly accessToken: {
            readonly method: "POST";
            readonly path: "/auth/edaya/access-token";
            readonly requestSchemaName: "AuthResource";
            readonly responseSchemaName: "AuthAccessToken";
            readonly basePath: "root";
        };
        readonly signOut: {
            readonly method: "POST";
            readonly path: "/auth/edaya/sign-out";
            readonly requestSchemaName: "AuthEmptyInput";
            readonly responseSchemaName: "AuthSuccess";
            readonly basePath: "root";
        };
        readonly signOutAll: {
            readonly method: "POST";
            readonly path: "/auth/edaya/sign-out-all";
            readonly requestSchemaName: "AuthEmptyInput";
            readonly responseSchemaName: "AuthSuccess";
            readonly basePath: "root";
        };
    };
    readonly authorization: {
        readonly effectiveGrants: {
            readonly method: "GET";
            readonly path: "authorization/effective-grants";
            readonly responseSchemaName: "EffectiveGrantsResponse";
        };
        readonly profiles: {
            readonly method: "GET";
            readonly path: "authorization/profiles";
            readonly responseSchemaName: "AuthorizationProfilesResponse";
        };
        readonly permissionCatalog: {
            readonly method: "GET";
            readonly path: "authorization/permission-catalog";
            readonly responseSchemaName: "PermissionCatalogResponse";
        };
        readonly scopeRender: {
            readonly method: "POST";
            readonly path: "authorization/scope/render";
            readonly requestSchemaName: "ScopeRenderRequest";
            readonly responseSchemaName: "ScopeRenderResponse";
        };
    };
    readonly onboarding: {
        readonly registerSchool: {
            readonly method: "POST";
            readonly path: "onboarding/register-school";
            readonly requestSchemaName: "OnboardingRegisterSchoolRequest";
            readonly responseSchemaName: "School";
        };
        readonly listStructureTemplates: {
            readonly method: "GET";
            readonly path: "onboarding/structure-templates";
            readonly responseSchemaName: "OnboardingListStructureTemplatesResponse";
        };
        readonly accountStatus: {
            readonly method: "GET";
            readonly path: "onboarding/account-status";
            readonly responseSchemaName: "OnboardingAccountStatusResponse";
        };
        readonly applyStructureTemplate: {
            readonly method: "POST";
            readonly path: "onboarding/apply-structure-template";
            readonly requestSchemaName: "OnboardingApplyStructureTemplateRequest";
            readonly responseSchemaName: "OnboardingApplyStructureTemplateResponse";
        };
        readonly completeWizard: {
            readonly method: "POST";
            readonly path: "onboarding/complete-wizard";
            readonly requestSchemaName: "OnboardingCompleteWizardRequest";
            readonly responseSchemaName: "OnboardingAccountStatusResponse";
        };
        readonly inviteStaffMembers: {
            readonly method: "POST";
            readonly path: "onboarding/invite-staff-members";
            readonly requestSchemaName: "OnboardingInviteStaffMembersRequest";
            readonly responseSchemaName: "OnboardingInviteStaffMembersResponse";
        };
        readonly provision: {
            readonly method: "POST";
            readonly path: "onboarding/provision";
            readonly requestSchemaName: "OnboardingProvisionRequest";
            readonly responseSchemaName: "OnboardingProvisionResponse";
        };
    };
    readonly serviceAccounts: {
        readonly list: {
            readonly method: "GET";
            readonly path: "service-accounts";
            readonly responseSchemaName: "ServiceAccountResponse";
            readonly responseIsArray: true;
        };
        readonly create: {
            readonly method: "POST";
            readonly path: "service-accounts";
            readonly requestSchemaName: "CreateServiceAccountRequest";
            readonly responseSchemaName: "CreateServiceAccountResponse";
        };
        readonly update: {
            readonly method: "PATCH";
            readonly path: "service-accounts/{id}";
            readonly pathParams: readonly ["id"];
            readonly requestSchemaName: "UpdateServiceAccountRequest";
            readonly responseSchemaName: "ServiceAccountResponse";
        };
        readonly revoke: {
            readonly method: "POST";
            readonly path: "service-accounts/{id}/revoke";
            readonly pathParams: readonly ["id"];
            readonly responseSchemaName: "ServiceAccountResponse";
        };
        readonly rotateKey: {
            readonly method: "POST";
            readonly path: "service-accounts/{id}/rotate-key";
            readonly pathParams: readonly ["id"];
            readonly responseSchemaName: "RotateServiceAccountKeyResponse";
        };
    };
    readonly platformUsers: {
        readonly me: {
            readonly method: "GET";
            readonly path: "platform/me";
            readonly responseSchemaName: "PlatformMeResponse";
        };
        readonly list: {
            readonly method: "GET";
            readonly path: "platform-users";
            readonly responseSchemaName: "PlatformUserResponse";
            readonly responseIsArray: true;
        };
        readonly create: {
            readonly method: "POST";
            readonly path: "platform-users";
            readonly requestSchemaName: "CreatePlatformUserRequest";
            readonly responseSchemaName: "PlatformUserResponse";
        };
        readonly deactivate: {
            readonly method: "POST";
            readonly path: "platform-users/{id}/deactivate";
            readonly pathParams: readonly ["id"];
            readonly responseSchemaName: "PlatformUserResponse";
        };
    };
    readonly s2sClients: {
        readonly list: {
            readonly method: "GET";
            readonly path: "s2s-clients";
            readonly responseSchemaName: "S2sClientResponse";
            readonly responseIsArray: true;
        };
        readonly create: {
            readonly method: "POST";
            readonly path: "s2s-clients";
            readonly requestSchemaName: "CreateS2sClientRequest";
            readonly responseSchemaName: "CreateS2sClientResponse";
        };
        readonly revoke: {
            readonly method: "POST";
            readonly path: "s2s-clients/{id}/revoke";
            readonly pathParams: readonly ["id"];
            readonly responseSchemaName: "S2sClientResponse";
        };
        readonly rotateKey: {
            readonly method: "POST";
            readonly path: "s2s-clients/{id}/rotate-key";
            readonly pathParams: readonly ["id"];
            readonly requestSchemaName: "RotateS2sClientKeyRequest";
            readonly responseSchemaName: "RotateS2sClientKeyResponse";
        };
    };
    readonly public: {
        readonly listMyInvitations: {
            readonly method: "GET";
            readonly path: "public/me/invitations";
            readonly responseSchemaName: "ListMyInvitationsResponse";
            readonly basePath: "root";
        };
        readonly acceptMyInvitation: {
            readonly method: "POST";
            readonly path: "public/me/invitations/{invitationId}/accept";
            readonly pathParams: readonly ["invitationId"];
            readonly responseSchemaName: "AcceptInvitationResponse";
            readonly basePath: "root";
        };
        readonly previewInvitation: {
            readonly method: "GET";
            readonly path: "public/invitations/{token}";
            readonly pathParams: readonly ["token"];
            readonly responseSchemaName: "InvitationPreviewResponse";
            readonly basePath: "root";
        };
        readonly acceptInvitation: {
            readonly method: "POST";
            readonly path: "public/invitations/{token}/accept";
            readonly pathParams: readonly ["token"];
            readonly responseSchemaName: "AcceptInvitationResponse";
            readonly basePath: "root";
        };
    };
    readonly files: {
        readonly createUploadIntent: {
            readonly method: "POST";
            readonly path: "files/upload-intents";
            readonly requestSchemaName: "CreateFileUploadIntentRequest";
            readonly responseSchemaName: "CreateFileUploadIntentResponse";
        };
        readonly getDownloadUrl: {
            readonly method: "GET";
            readonly path: "files/{attachmentId}/download-url";
            readonly pathParams: readonly ["attachmentId"];
            readonly responseSchemaName: "FileDownloadUrlResponse";
        };
        readonly getContent: {
            readonly method: "GET";
            readonly path: "files/{attachmentId}/content";
            readonly pathParams: readonly ["attachmentId"];
        };
    };
};
export type ClientBindings = typeof clientBindings;
//# sourceMappingURL=client-bindings.d.ts.map