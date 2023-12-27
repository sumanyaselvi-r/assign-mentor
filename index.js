const express = require('express');
const { MongoClient, ObjectId } = require("mongodb");
const app = express()
const cors = require("cors");
const dotenv = require('dotenv').config();
const port = 4000;
const URL = process.env.DB;
app.use(express.json())
app.use(
  cors({
    origin: "*",
  })
);

app.get("/", function (req, res) {
  
    res.send(`
    <h2 style="text-align:center">Mentor and Student Assigning with Database
    </h2>
    <div style="display:flex; justify-content:center;padding:20px;"> 
    <div style="  padding:20px;"> 
    <p style="color:white;background-color:white; padding:10px 40px; margin:10px 20px; text-align:center ">
      <a href="/mentors" style="text-decoration:none;color:black;">All Mentors list</a>
    </p>

    <p style="color:white;background-color:white; padding:10px 5px; margin:10px 20px; text-align:center ">
    <a href="/all-students"  style="text-decoration:none;color:black;">All Students List</a></p>

   
    </div>
    </div>
    `);
  
});


// 1. write API to create Mentor
app.post("/creatementor", async (req, res) => {
  try {
    const {mentorName,mentorMail} = req.body
    const connection = await MongoClient.connect(URL)
    const db = connection.db("FSD")
    const result = await db.collection("mentors").insertOne({
      mentorName: mentorName,
      mentorMail: mentorMail,
      students: []
    })
    res.send({
      message: 'Mentor created successfully',
      result : result,  
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message : 'something went wrong '
    })
  }
})


//get all mentors
app.get("/mentors", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const mentorsData = await db.collection("mentors").find({}).toArray();
    connection.close();
    res.send(mentorsData);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});


//2. write API to create Student
app.post("/create-student", async (req, res) => {
  try {
    const {studentName,studentMail} = req.body;
    const newStudent = {
      studentName: studentName,
      studentMail: studentMail,
      oldMentor: null,
      currentMentor: null
    };
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const result = await db.collection('students').insertOne(newStudent);
    connection.close();
    res.send({
      message: 'Student created successfully',
      result : result
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});


// 3. Write API to Assign a student to Mentor
// a)Select a mentor and Add multiple Students
app.post("/studentToMentor", async (req, res) => {
  try {
    const {mentorId,studentId} = req.body;
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const mentorsCollection = db.collection("mentors");
    const studentsCollection = db.collection("students");
    
    const mentor = await mentorsCollection.findOne({ _id: mentorObjectId });
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!mentor || !student) {
      res.status(404).send({ error: "Mentor or student not found" });
      return;
    }
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      { $set: { oldMentor: student.currentMentor, currentMentor: mentor.mentorName } }
    );
  
    await mentorsCollection.updateOne(
      { _id: mentorObjectId },
      { $push: { students: { studentName: student.studentName, studentMail: student.studentMail, studentId: studentObjectId } } }
    );
    connection.close();
    res.send({
      success: true,
      message: 'Mentor assigned',
      mentorName: mentor.mentorName
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});


//b)API to A student who has a mentor should not be shown in List

app.get("/students-without-mentors", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const studentsData = await db.collection("students").find({
      oldMentor: { $eq: null },
      currentMentor: { $eq: null }
    }).toArray();
    const students = studentsData.map((item) => ({
      studentId: item._id.toString(),
      studentName: item.studentName,
      studentMail: item.studentMail,
      oldMentor: item.oldMentor,
      currentMentor: item.currentMentor
    }));
    connection.close();

    if (students.length > 0) {
      res.send(students);
    } else {
      res.send({ message: "No students with both oldMentor and currentMentor found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});



// 4. Write API to Assign or Change Mentor for particular Student
// Select a Student and Assign a Mentor
app.post("/change-mentor", async (req, res) => {
  try {
    const {mentorId,studentId,currentMentor:newcurrentMentor}=req.body
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const mentorsCollection = db.collection("mentors");
    const studentsCollection = db.collection("students");
    const mentor = await mentorsCollection.findOne({ _id: mentorObjectId });
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!mentor || !student) {
      res.status(404).send({ error: "Mentor or student not found" });
      return;
    }
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      { $set: { oldMentor: student.currentMentor, currentMentor: newcurrentMentor } }
    );
    await mentorsCollection.updateOne(
      { _id: mentorObjectId },
      { $push: { students: { studentName: student.studentName, studentMail: student.studentMail, studentId: studentObjectId } } }
    );
    connection.close();
    res.send({ success: true, message : 'mentor changed for this student' });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});

// get all students
app.get("/all-students", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const studentsData = await db.collection("students").find({}).toArray();
    const students = studentsData.map((item) => ({
      studentId: item._id.toString(),
      studentName: item.studentName,
      studentMail: item.studentMail,
      oldMentor: item.oldMentor,
      currentMentor: item.currentMentor
    }));
    connection.close();
    res.send(students);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});


// 5. Write API to show all students for a particular mentor
app.get("/:mentorName/students", async (req, res) => {

  try {
    const mentorName = req.params.mentorName;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const mentorsCollection = db.collection("mentors");
    const mentor = await mentorsCollection.findOne({mentorName:mentorName});

    res.send(mentor.students)
    
  } catch (error) {
    console.log(error)
  }
})


// 6. Write API to show the previously assigned mentor for a particular student
app.get("/oldmentor-by-student/:studentName", async (req, res) => {
  try {
    const {studentName} = req.params;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("FSD");
    const studentsCollection = db.collection("students");
    const student = await studentsCollection.findOne({ studentName: studentName });
    if(student.oldMentor === null) {
      res.send({
        message : 'No older mentor for this student'
      })
    }else{
      res.send({ oldMentor: student.oldMentor })
    }
  } catch (error) {
    console.log(error)
  }
})



app.listen(port, () => {
  console.log("server started at " + port);
});