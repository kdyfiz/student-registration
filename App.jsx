import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSync, faHistory } from '@fortawesome/free-solid-svg-icons';
import StudentRegistration from './artifacts/StudentRegistration.json';
import './App.css';

const OwnerAddress = '0xc13de348217b7689D026163baC80A1bBD60DF256';

const App = () => {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');
    const [students, setStudents] = useState(['kd']);
    const [newStudentName, setNewStudentName] = useState('');
    const [courses, setCourses] = useState([
        'CNS4504',
        'CNS3202',
        'CSC4202',
        'CSC3100'
    ]);
    const [newCourseName, setNewCourseName] = useState('');
    const [studentIndex, setStudentIndex] = useState('');
    const [courseIndex, setCourseIndex] = useState('');
    const [enrollments, setEnrollments] = useState([]);

    const [editingStudentIndex, setEditingStudentIndex] = useState(null);
    const [editingCourseIndex, setEditingCourseIndex] = useState(null);
    const [editStudentName, setEditStudentName] = useState('');
    const [editCourseName, setEditCourseName] = useState('');

    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadWeb3 = async () => {
            if (window.ethereum) {
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);
                try {
                    await window.ethereum.enable();
                    const accounts = await web3Instance.eth.getAccounts();
                    setAccount(accounts[0]);
                    window.ethereum.on('accountsChanged', async (newAccounts) => {
                        setAccount(newAccounts[0]);
                        setError('');  // Clear error message when account changes
                    });
                    const networkId = await web3Instance.eth.net.getId();
                    const deployedNetwork = StudentRegistration.networks[networkId];
                    const contractInstance = new web3Instance.eth.Contract(
                        StudentRegistration.abi,
                        deployedNetwork && deployedNetwork.address,
                    );
                    setContract(contractInstance);
                } catch (error) {
                    console.error("Failed to load web3 or accounts:", error);
                }
            } else {
                console.error("Web3 provider not detected.");
            }
        };
        loadWeb3();
    }, []);

    
    useEffect(() => {
        refreshEnrollments();
    }, [students, courses]);

    const refreshEnrollments = () => {
        const updatedEnrollments = [];
        courses.forEach(course => {
            const enrolledStudents = getStudentsByCourse(course);
            enrolledStudents.forEach(student => {
                updatedEnrollments.push({ student, course });
            });
        });
        setEnrollments(updatedEnrollments);
    };

    const handleAddStudent = async () => {
        const newStudentNameLower = newStudentName.trim().toLowerCase();
        if (newStudentNameLower !== '' && !students.map(s => s.toLowerCase()).includes(newStudentNameLower)) {
            try {
                if (account.toLowerCase() !== OwnerAddress.toLowerCase()) {
                    throw new Error("Only the owner can add a student.");
                }
                await contract.methods.registerStudent(account, newStudentName, Date.now(), '').send({ from: account });
                const updatedStudents = [...students, newStudentName];
                setStudents(updatedStudents);
                setNewStudentName('');
                updateHistory(`Added student: ${newStudentName}`);
            } catch (error) {
                setError(error.message);
                console.error("Failed to add student:", error);
            }
        } else {
            setError("Student name already exists or is invalid.");
        }
    };

    const handleAddCourse = async () => {
        const newCourseNameLower = newCourseName.trim().toLowerCase();
        if (newCourseNameLower !== '' && !courses.map(c => c.toLowerCase()).includes(newCourseNameLower)) {
            try {
                if (account.toLowerCase() !== OwnerAddress.toLowerCase()) {
                    throw new Error("Only the owner can add a course.");
                }
                const updatedCourses = [...courses, newCourseName];
                setCourses(updatedCourses);
                setNewCourseName('');
                updateHistory(`Added course: ${newCourseName}`);
            } catch (error) {
                setError(error.message);
                console.error("Failed to add course:", error);
            }
        } else {
            setError("Course name already exists or is invalid.");
        }
    };

    const handleEnrollStudent = async () => {
        if (studentIndex !== '' && courseIndex !== '') {
            const student = students[studentIndex];
            const course = courses[courseIndex];
            const isAlreadyEnrolled = enrollments.some(enrollment => enrollment.student === student && enrollment.course === course);

            if (!isAlreadyEnrolled) {
                const enrollment = {
                    student: students[studentIndex],
                    course: courses[courseIndex],
                    timestamp: new Date().toLocaleString()
                };
                const updatedEnrollments = [...enrollments, enrollment];
                setEnrollments(updatedEnrollments);
                setStudentIndex('');
                setCourseIndex('');

                try {
                    await contract.methods.enrollStudent(parseInt(studentIndex), parseInt(courseIndex)).send({ from: account });
                    updateHistory(`Enrolled student ${students[studentIndex]} in course ${courses[courseIndex]} at ${enrollment.timestamp}`);
                } catch (error) {
                    setError(error.message);
                    console.error("Failed to enroll student:", error);
                }
            } else {
                setError("Student is already enrolled in this course.");
            }
        }
    };
    

    const handleEditStudent = (index) => {
        if (account.toLowerCase() !== OwnerAddress.toLowerCase()){
            setError("Only the owner can edit student details.");
            return;
        }
        setEditingStudentIndex(index);
        setEditStudentName(students[index]);
    };

    const handleEditCourse = (index) => {
        if (account.toLowerCase() !== OwnerAddress.toLowerCase()) {
            setError("Only the owner can edit course details.");
            return;
        }
        setEditingCourseIndex(index);
        setEditCourseName(courses[index]);
    };

    const handleUpdateStudent = async () => {
        const updatedStudents = [...students];
        updatedStudents[editingStudentIndex] = editStudentName;
        setStudents(updatedStudents);
        setEditingStudentIndex(null);
        setEditStudentName('');
        updateHistory(`Updated student name to: ${editStudentName}`);
    };

    const handleUpdateCourse = async () => {
        const updatedCourses = [...courses];
        updatedCourses[editingCourseIndex] = editCourseName;
        setCourses(updatedCourses);
        setEditingCourseIndex(null);
        setEditCourseName('');
        updateHistory(`Updated course name to: ${editCourseName}`);
    };

    const handleDeleteStudent = async (index) => {
        if (account.toLowerCase() !== OwnerAddress.toLowerCase()) {
            setError("Only the owner can delete a student.");
            return;
        }
        const deletedStudent = students[index];
        const updatedStudents = students.filter((_, i) => i !== index);
        setStudents(updatedStudents);

        const updatedEnrollments = enrollments.filter(enrollment => enrollment.student !== deletedStudent);
        setEnrollments(updatedEnrollments);

        updateHistory(`Deleted student: ${deletedStudent}`);
    };

    const handleDeleteCourse = async (index) => {
        if (account !== OwnerAddress) {
            setError("Only the owner can delete a course.");
            return;
        }
        const deletedCourse = courses[index];
        const updatedCourses = courses.filter((_, i) => i !== index);
        setCourses(updatedCourses);

        const updatedEnrollments = enrollments.filter(enrollment => enrollment.course !== deletedCourse);
        setEnrollments(updatedEnrollments);

        updateHistory(`Deleted course: ${deletedCourse}`);
    };

    const handleRefreshEnrollments = () => {
        const updatedEnrollments = [];
        courses.forEach(course => {
            const enrolledStudents = getStudentsByCourse(course);
            enrolledStudents.forEach(student => {
                updatedEnrollments.push({ student, course });
            });
        });
        setEnrollments(updatedEnrollments);

        updateHistory(`Refreshed enrollments`);
    };

    const getStudentsByCourse = (course) => {
        return enrollments.filter(enrollment => enrollment.course === course).map(enrollment => enrollment.student);
    };

    const renderEnrollments = () => {
        const enrollmentBoxes = courses.map((course, index) => {
            const enrolledStudents = getStudentsByCourse(course);
            return (
                <div key={index} className="enrollmentBox">
                    <h3 className="courseHeading">{course}</h3>
                    <ul className="list">
                        {enrolledStudents.length === 0 ? (
                            <li className="listItem">No students enrolled in {course}</li>
                        ) : (
                            enrolledStudents.map((student, idx) => (
                                <li key={idx} className="listItem">{student}</li>
                            ))
                        )}
                    </ul>
                </div>
            );
        });

        return (
            <div className="enrollmentsGrid">
                {enrollmentBoxes}
            </div>
        );
    };

    const renderHistory = () => {
        return (
            <div className="history">
                <h2 className="subHeading">Action History</h2>
                <ul className="historyList">
                    {history.map((action, index) => (
                        <li key={index} className="historyItem">{action}</li>
                    ))}
                </ul>
            </div>
        );
    };

    const updateHistory = (action) => {
        const updatedHistory = [...history, `${new Date().toLocaleString()}: ${action}`];
        setHistory(updatedHistory);
    };

    return (
        <div className="container">
            <header className="header">
                <h1 className="heading">Student Registration DApp</h1>
                <div className="currentAccount">
                    <b>Current Account:</b> {account}
                    <br />
                    {account.toLowerCase() === OwnerAddress.toLowerCase() ? (
                    <span> Account: Admin</span>
                ) : (
                    <span> Account: Student</span>
                )}
                </div>
            </header>

            <div className="content">
                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                <div className="section">
                    <div className="card">
                        <h2 className="subHeading">Registered Students</h2>
                        <ul className="list">
                            {students.length === 0 ? (
                                <li className="listItem">No students registered yet.</li>
                            ) : (
                                students.map((student, index) => (
                                    <li key={index} className="listItem">
                                        {editingStudentIndex === index ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editStudentName}
                                                    onChange={(e) => setEditStudentName(e.target.value)}
                                                    className="input"
                                                />
                                                <button className="button" onClick={handleUpdateStudent}>Update</button>
                                                <button className="button" onClick={() => setEditingStudentIndex(null)}>Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                {student}
                                                <button className="editButton" onClick={() => handleEditStudent(index)}><FontAwesomeIcon icon={faEdit} className="icon" /> Edit</button>
                                                <button className="deleteButton" onClick={() => handleDeleteStudent(index)}><FontAwesomeIcon icon={faTrash} className="icon" /> Delete</button>
                                            </>
                                        )}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                    <div className="card">
                        <h2 className="subHeading">Registered Courses</h2>
                        <ul className="list">
                            {courses.length === 0 ? (
                                <li className="listItem">No courses registered yet.</li>
                            ) : (
                                courses.map((course, index) => (
                                    <li key={index} className="listItem">
                                        {editingCourseIndex === index ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editCourseName}
                                                    onChange={(e) => setEditCourseName(e.target.value)}
                                                    className="input"
                                                />
                                                <button className="button" onClick={handleUpdateCourse}><FontAwesomeIcon icon={faEdit} className="icon" /></button>
                                                <button className="button" onClick={() => setEditingCourseIndex(null)}><FontAwesomeIcon icon={faTrash} className="icon" /></button>
                                            </>
                                        ) : (
                                            <>
                                                {course}
                                                <button className="editButton" onClick={() => handleEditCourse(index)}><FontAwesomeIcon icon={faEdit} className="icon" /> Edit</button>
                                                <button className="deleteButton" onClick={() => handleDeleteCourse(index)}><FontAwesomeIcon icon={faTrash} className="icon" /> Delete</button>
                                            </>
                                        )}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>

                <div className="actions">
                    <div className="formCard">
                        <h3 className="formHeader">Register Student</h3>
                        <input
                            type="text"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            className="input"
                            placeholder="Enter student name"
                        />
                        <button className="button" onClick={handleAddStudent}>Register Student</button>
                    </div>
                    <div className="formCard">
                        <h3 className="formHeader">Register Course</h3>
                        <input
                            type="text"
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            className="input"
                            placeholder="Enter course name"
                        />
                        <button className="button" onClick={handleAddCourse}>Register Course</button>
                    </div>
                    <div className="formCard">
                        <h3 className="formHeader">Enroll Student</h3>
                        <select
                            value={studentIndex}
                            onChange={(e) => setStudentIndex(e.target.value)}
                            className="select"
                        >
                            <option value="">Select Student</option>
                            {students.map((student, index) => (
                                <option key={index} value={index}>
                                    {student}
                                </option>
                            ))}
                        </select>
                        <select
                            value={courseIndex}
                            onChange={(e) => setCourseIndex(e.target.value)}
                            className="select"
                        >
                            <option value="">Select Course</option>
                            {courses.map((course, index) => (
                                <option key={index} value={index}>
                                    {course}
                                </option>
                            ))}
                        </select>
                        <button className="button" onClick={handleEnrollStudent}>
                            Enroll Student
                        </button>
                    </div>
                </div>

                <div className="enrollments">
                    <div className="enrollmentsHeader">
                        <h2 className="subHeading">Enrollments</h2>
                        <button className="refreshButton" onClick={handleRefreshEnrollments}>
                            <FontAwesomeIcon icon={faSync} className="icon" /> Refresh
                        </button>
                    </div>
                    {enrollments.length === 0 ? (
                        <p>No students enrolled in courses yet.</p>
                    ) : (
                        renderEnrollments()
                    )}
                </div>

                {renderHistory()}
            </div>
        </div>
    );
};

export default App;
