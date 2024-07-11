// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract StudentRegistration is Ownable {
    struct Student {
        string name;
        bool exists;
    }

    struct Course {
        string name;
        bool exists;
    }

    struct Enrollment {
        uint studentId;
        uint courseId;
    }

    mapping(uint => Student) public students;
    mapping(uint => Course) public courses;
    Enrollment[] public enrollments;

    uint public studentsCount;
    uint public coursesCount;
    uint public enrollmentsCount;

    event StudentAdded(uint indexed id, string name);
    event CourseAdded(uint indexed id, string name);
    event EnrollmentAdded(uint indexed studentId, uint indexed courseId);

    function addStudent(string memory name) public onlyOwner {
        students[studentsCount] = Student(name, true);
        emit StudentAdded(studentsCount, name);
        studentsCount++;
    }

    function addCourse(string memory name) public onlyOwner {
        courses[coursesCount] = Course(name, true);
        emit CourseAdded(coursesCount, name);
        coursesCount++;
    }

    function enrollStudent(uint studentId, uint courseId) public {
    require(studentId < studentsCount, "Invalid student ID.");
    require(courseId < coursesCount, "Invalid course ID.");
    enrollments.push(Enrollment(studentId, courseId));
    emit EnrollmentAdded(studentId, courseId);
    enrollmentsCount++;
    }
}
